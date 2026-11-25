export const MAX_VIDEO_UPLOAD_BYTES = 512 * 1024 * 1024

const VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-m4v',
])

export function getVideoMimeType(file) {
  if (VIDEO_MIME_TYPES.has(file.type)) return file.type
  const extension = file.name?.split('.').pop()?.toLowerCase()
  return ({
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
    m4v: 'video/x-m4v',
  })[extension] || ''
}
