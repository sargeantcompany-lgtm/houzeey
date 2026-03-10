import { useState, useRef, useEffect, useCallback } from 'react'
import './MediaCapture.css'

export default function MediaCapture({ onMediaCaptured }) {
  const [mode, setMode] = useState('photo')         // 'photo' | 'video'
  const [streaming, setStreaming] = useState(false)
  const [recording, setRecording] = useState(false)
  const [captured, setCaptured] = useState([])       // { type, url, blob }
  const [error, setError] = useState(null)
  const [facingMode, setFacingMode] = useState('environment') // back camera default

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setStreaming(false)
  }, [])

  const startCamera = useCallback(async () => {
    stopStream()
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: mode === 'video',
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setStreaming(true)
    } catch (err) {
      setError('Camera access denied. Please allow camera permissions and try again.')
    }
  }, [facingMode, mode, stopStream])

  // Restart camera when mode or facing changes
  useEffect(() => {
    if (streaming) startCamera()
  }, [mode, facingMode]) // eslint-disable-line

  useEffect(() => {
    return () => stopStream()
  }, [stopStream])

  function takePhoto() {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob)
      const item = { type: 'photo', url, blob, name: `photo-${Date.now()}.jpg` }
      setCaptured(prev => [...prev, item])
      onMediaCaptured?.(item)
    }, 'image/jpeg', 0.92)
  }

  function startRecording() {
    if (!streamRef.current) return
    chunksRef.current = []
    const recorder = new MediaRecorder(streamRef.current, { mimeType: getSupportedMimeType() })
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/mp4' })
      const url = URL.createObjectURL(blob)
      const item = { type: 'video', url, blob, name: `video-${Date.now()}.mp4` }
      setCaptured(prev => [...prev, item])
      onMediaCaptured?.(item)
    }
    recorder.start(100)
    recorderRef.current = recorder
    setRecording(true)
  }

  function stopRecording() {
    recorderRef.current?.stop()
    setRecording(false)
  }

  function removeItem(index) {
    setCaptured(prev => {
      URL.revokeObjectURL(prev[index].url)
      return prev.filter((_, i) => i !== index)
    })
  }

  return (
    <div className="media-capture">
      {/* Mode tabs */}
      <div className="capture-tabs">
        <button
          className={mode === 'photo' ? 'active' : ''}
          onClick={() => setMode('photo')}
        >📸 Photo</button>
        <button
          className={mode === 'video' ? 'active' : ''}
          onClick={() => setMode('video')}
        >🎥 Video</button>
      </div>

      {/* Camera view */}
      {!streaming ? (
        <div className="camera-start">
          {error ? (
            <div className="camera-error">
              <span>⚠️</span>
              <p>{error}</p>
              <button onClick={startCamera}>Try again</button>
            </div>
          ) : (
            <div className="camera-prompt">
              <span>{mode === 'photo' ? '📸' : '🎥'}</span>
              <p>Open camera to {mode === 'photo' ? 'take photos' : 'record video'}</p>
              <button className="btn-open-camera" onClick={startCamera}>Open camera</button>
            </div>
          )}
        </div>
      ) : (
        <div className="camera-view">
          <video ref={videoRef} className="camera-feed" playsInline muted autoPlay />

          {/* Recording indicator */}
          {recording && (
            <div className="recording-badge">⏺ REC</div>
          )}

          <div className="camera-controls">
            {/* Flip camera */}
            <button
              className="ctrl-btn flip-btn"
              onClick={() => setFacingMode(f => f === 'environment' ? 'user' : 'environment')}
              title="Flip camera"
            >🔄</button>

            {/* Capture / Record */}
            {mode === 'photo' ? (
              <button className="shutter-btn" onClick={takePhoto} title="Take photo" />
            ) : (
              <button
                className={`record-btn ${recording ? 'recording' : ''}`}
                onClick={recording ? stopRecording : startRecording}
                title={recording ? 'Stop recording' : 'Start recording'}
              >
                {recording ? '⏹' : '⏺'}
              </button>
            )}

            {/* Close camera */}
            <button className="ctrl-btn close-btn" onClick={stopStream} title="Close camera">✕</button>
          </div>
        </div>
      )}

      {/* Captured media gallery */}
      {captured.length > 0 && (
        <div className="captured-gallery">
          <h4>Captured ({captured.length})</h4>
          <div className="captured-grid">
            {captured.map((item, i) => (
              <div key={i} className="captured-item">
                {item.type === 'photo' ? (
                  <img src={item.url} alt={`Photo ${i + 1}`} />
                ) : (
                  <video src={item.url} controls />
                )}
                <div className="captured-overlay">
                  <span className="captured-type">{item.type === 'photo' ? '📸' : '🎥'}</span>
                  <button className="remove-btn" onClick={() => removeItem(i)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function getSupportedMimeType() {
  const types = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']
  return types.find(t => MediaRecorder.isTypeSupported(t)) || ''
}
