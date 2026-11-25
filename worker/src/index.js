import { createReadStream, createWriteStream } from 'node:fs'
import { mkdtemp, rm, stat } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { pipeline } from 'node:stream/promises'
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config()

const { Pool } = pg
const queueName = 'houzeey-video-processing'
const maxDurationSeconds = Number(process.env.MAX_VIDEO_DURATION_SECONDS || 180)

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
if (!process.env.REDIS_URL) throw new Error('REDIS_URL is required')
if (!Number.isSafeInteger(maxDurationSeconds) || maxDurationSeconds < 1) {
  throw new Error('MAX_VIDEO_DURATION_SECONDS must be a positive whole number')
}
const workerConcurrency = Number(process.env.VIDEO_WORKER_CONCURRENCY || 1)
if (!Number.isSafeInteger(workerConcurrency) || workerConcurrency < 1) {
  throw new Error('VIDEO_WORKER_CONCURRENCY must be a positive whole number')
}

const bucketConfig = {
  endpoint: process.env.BUCKET_ENDPOINT,
  bucket: process.env.BUCKET_NAME,
  region: process.env.BUCKET_REGION,
  accessKeyId: process.env.BUCKET_ACCESS_KEY_ID,
  secretAccessKey: process.env.BUCKET_SECRET_ACCESS_KEY,
}
const missingBucketConfig = Object.entries(bucketConfig)
  .filter(([, value]) => !value)
  .map(([name]) => name)
if (missingBucketConfig.length) {
  throw new Error(`Missing bucket configuration: ${missingBucketConfig.join(', ')}`)
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})
const s3 = new S3Client({
  endpoint: bucketConfig.endpoint,
  region: bucketConfig.region,
  forcePathStyle: false,
  credentials: {
    accessKeyId: bucketConfig.accessKeyId,
    secretAccessKey: bucketConfig.secretAccessKey,
  },
})

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => { stdout += chunk.toString() })
    child.stderr.on('data', chunk => {
      stderr = `${stderr}${chunk.toString()}`.slice(-8000)
    })
    child.on('error', reject)
    child.on('close', code => {
      if (code === 0) return resolve(stdout.trim())
      reject(new Error(`${path.basename(command)} exited with code ${code}: ${stderr.trim()}`))
    })
  })
}

async function uploadFile(key, filePath, contentType) {
  const fileInfo = await stat(filePath)
  await s3.send(new PutObjectCommand({
    Bucket: bucketConfig.bucket,
    Key: key,
    Body: createReadStream(filePath),
    ContentLength: fileInfo.size,
    ContentType: contentType,
  }))
}

async function processVideo(videoId) {
  let video
  let tempDir

  try {
    const result = await pool.query(
      "SELECT id, listing_id, original_key FROM videos WHERE id = $1 AND status = 'processing'",
      [videoId],
    )
    if (!result.rowCount) throw new Error('Video is no longer queued for processing')
    video = result.rows[0]
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'houzeey-video-'))
    const inputPath = path.join(tempDir, 'source')
    const outputPath = path.join(tempDir, 'playback.mp4')
    const thumbnailPath = path.join(tempDir, 'thumbnail.jpg')
    const mp4Key = `processed/${video.listing_id}/${video.id}/playback.mp4`
    const thumbKey = `processed/${video.listing_id}/${video.id}/thumbnail.jpg`

    const object = await s3.send(new GetObjectCommand({
      Bucket: bucketConfig.bucket,
      Key: video.original_key,
    }))
    await pipeline(object.Body, createWriteStream(inputPath))

    const durationOutput = await runCommand(process.env.FFPROBE_PATH || 'ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      inputPath,
    ])
    const duration = Number(durationOutput)
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error('Could not determine the processed video duration')
    }
    if (duration > maxDurationSeconds) {
      throw new Error(`Video exceeds the ${maxDurationSeconds}-second duration limit`)
    }

    await runCommand(process.env.FFMPEG_PATH || 'ffmpeg', [
      '-y',
      '-i', inputPath,
      '-vf', 'scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:black',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      outputPath,
    ])

    await runCommand(process.env.FFMPEG_PATH || 'ffmpeg', [
      '-y',
      '-ss', '1',
      '-i', outputPath,
      '-frames:v', '1',
      '-q:v', '3',
      thumbnailPath,
    ])

    await uploadFile(mp4Key, outputPath, 'video/mp4')
    await uploadFile(thumbKey, thumbnailPath, 'image/jpeg')
    const updated = await pool.query(`
      UPDATE videos
      SET mp4_key = $2, thumb_key = $3, duration_seconds = $4,
        status = 'ready', error = NULL, updated_at = NOW()
      WHERE id = $1 AND status = 'processing'
    `, [video.id, mp4Key, thumbKey, Math.ceil(duration)])
    if (!updated.rowCount) throw new Error('Video processing was superseded')
  } finally {
    if (tempDir) await rm(tempDir, { recursive: true, force: true })
  }
}

const connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
const worker = new Worker(
  queueName,
  job => processVideo(job.data.videoId),
  {
    connection,
    concurrency: workerConcurrency,
  },
)

worker.on('failed', (job, error) => {
  console.error(`Video job ${job?.id || 'unknown'} failed:`, error)
  if (job && job.attemptsMade >= (job.opts.attempts || 1)) {
    const message = String(error?.message || 'Video worker failed').slice(0, 1000)
    pool.query(`
      UPDATE videos
      SET status = 'failed', error = $2, updated_at = NOW()
      WHERE id = $1 AND status = 'processing'
    `, [job.data.videoId, message]).catch(statusError => {
      console.error(`Could not record final failure for video ${job.data.videoId}:`, statusError)
    })
  }
})
worker.on('error', error => {
  console.error('Video worker error:', error)
})

await worker.waitUntilReady()
console.log(`Houzeey video worker listening on ${queueName}`)

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await worker.close()
    await connection.quit()
    await pool.end()
    process.exit(0)
  })
}
