import { Queue } from 'bullmq'
import IORedis from 'ioredis'

let queue

export function getVideoQueue() {
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL is required to queue video processing')
  }

  if (!queue) {
    const connection = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
    })
    queue = new Queue('houzeey-video-processing', { connection })
  }

  return queue
}
