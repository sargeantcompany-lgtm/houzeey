import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

let client

function getBucketSettings() {
  const settings = {
    endpoint: process.env.BUCKET_ENDPOINT,
    bucket: process.env.BUCKET_NAME,
    region: process.env.BUCKET_REGION,
    accessKeyId: process.env.BUCKET_ACCESS_KEY_ID,
    secretAccessKey: process.env.BUCKET_SECRET_ACCESS_KEY,
  }

  const missing = Object.entries(settings)
    .filter(([, value]) => !value)
    .map(([name]) => name)

  if (missing.length) {
    throw new Error(`Missing bucket configuration: ${missing.join(', ')}`)
  }

  return settings
}

function getClient() {
  if (!client) {
    const settings = getBucketSettings()
    client = new S3Client({
      endpoint: settings.endpoint,
      region: settings.region,
      forcePathStyle: false,
      credentials: {
        accessKeyId: settings.accessKeyId,
        secretAccessKey: settings.secretAccessKey,
      },
    })
  }

  return client
}

export function getBucketName() {
  return getBucketSettings().bucket
}

export async function createUploadUrl(key, contentType, contentLength, expiresIn = 3600) {
  const settings = getBucketSettings()
  return getSignedUrl(
    getClient(),
    new PutObjectCommand({
      Bucket: settings.bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: contentLength,
    }),
    { expiresIn },
  )
}

export async function inspectBucketObject(key) {
  const settings = getBucketSettings()
  return getClient().send(new HeadObjectCommand({
    Bucket: settings.bucket,
    Key: key,
  }))
}

export async function createPlaybackUrls(mp4Key, thumbKey, expiresIn = 6 * 60 * 60) {
  const settings = getBucketSettings()
  const s3 = getClient()
  const [videoUrl, thumbnailUrl] = await Promise.all([
    getSignedUrl(s3, new GetObjectCommand({
      Bucket: settings.bucket,
      Key: mp4Key,
      ResponseContentType: 'video/mp4',
    }), { expiresIn }),
    getSignedUrl(s3, new GetObjectCommand({
      Bucket: settings.bucket,
      Key: thumbKey,
      ResponseContentType: 'image/jpeg',
    }), { expiresIn }),
  ])

  return { videoUrl, thumbnailUrl, expiresIn }
}
