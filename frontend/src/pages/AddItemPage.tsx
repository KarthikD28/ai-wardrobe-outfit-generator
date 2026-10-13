import { type DragEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { ItemFields, type ItemFieldValues } from '../components/ItemFields'
import { ItemTags } from '../components/ItemTags'
import { COLORS, type Color, type Item } from '../types'

const EMPTY_FIELDS: ItemFieldValues = { name: '', category: 'top', fit: 'regular', pattern: 'solid' }

function cameraErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : ''
  if (name === 'NotAllowedError')
    return 'Camera access was blocked. Allow it in the address bar, or upload a photo instead.'
  if (name === 'NotFoundError') return 'No camera was found. Upload a photo instead.'
  return 'The camera could not be started. Upload a photo instead.'
}

export function AddItemPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [fields, setFields] = useState(EMPTY_FIELDS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<Item | null>(null)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream
    return () => stream?.getTracks().forEach((track) => track.stop())
  }, [stream])

  const previewUrl = useMemo(() => (photo ? URL.createObjectURL(photo) : ''), [photo])
  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl])

  async function startCamera() {
    setError('')
    // Browsers only allow a live camera preview on https or localhost. A phone reaching
    // the app over Wi-Fi gets neither, so hand off to its own camera app instead.
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraRef.current?.click()
      return
    }
    try {
      setStream(
        await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }),
      )
    } catch (err) {
      setError(cameraErrorMessage(err))
    }
  }

  function capture() {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        setPhoto(blob)
        setStream(null)
      },
      'image/jpeg',
      0.92,
    )
  }

  function choose(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('Choose an image file.')
    setError('')
    setStream(null)
    setPhoto(file)
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    choose(event.dataTransfer.files[0])
  }

  async function save() {
    if (!photo) return
    setSaving(true)
    setError('')
    try {
      setSaved(await api.createItem({ photo, ...fields }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the item')
    } finally {
      setSaving(false)
    }
  }

  async function correctColor(color: Color) {
    if (!saved) return
    try {
      setSaved(await api.updateItem(saved.id, { color }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the colour')
    }
  }

  function reset() {
    setPhoto(null)
    setSaved(null)
    setFields(EMPTY_FIELDS)
    setError('')
  }

  if (saved) {
    return (
      <div className="page narrow">
        <h1>Added to your wardrobe</h1>
        <div className="card result">
          <div className="cutout">
            <img src={saved.image_url} alt={saved.name || saved.category} />
          </div>
          <div className="result-body">
            <ItemTags item={saved} />
            {!saved.background_removed && (
              <p className="hint">The background could not be removed, so the photo was kept as is.</p>
            )}
            <label className="field">
              <span className="field-label">Detected colour</span>
              <select value={saved.color} onChange={(e) => correctColor(e.target.value as Color)}>
                {COLORS.map((color) => (
                  <option key={color}>{color}</option>
                ))}
              </select>
              <span className="hint">Change this if the guess is wrong.</span>
            </label>
            {error && <p className="error">{error}</p>}
            <div className="row">
              <button className="primary" onClick={reset}>
                Add another
              </button>
              <Link className="button" to="/">
                View wardrobe
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page narrow">
      <h1>Add Item</h1>
      <p className="muted">Lay the item flat on a plain surface for the cleanest cut-out.</p>

      {!photo && (
        <div
          className={`card capture ${dragging ? 'dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          {stream ? (
            <>
              <video ref={videoRef} autoPlay playsInline muted />
              <div className="row">
                <button className="primary" onClick={capture}>
                  Take photo
                </button>
                <button onClick={() => setStream(null)}>Cancel</button>
              </div>
            </>
          ) : (
            <>
              <p className="capture-prompt">Take a photo, or drop an image here</p>
              <div className="row">
                <button className="primary" onClick={startCamera}>
                  Use camera
                </button>
                <button onClick={() => fileRef.current?.click()}>Upload photo</button>
              </div>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              choose(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => {
              choose(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>
      )}

      {photo && (
        <div className="card tagging">
          <img className="preview" src={previewUrl} alt="Your photo" />
          <div className="tagging-fields">
            <ItemFields value={fields} onChange={setFields} />
            <div className="row">
              <button className="primary" onClick={save} disabled={saving}>
                {saving ? 'Removing background…' : 'Save to wardrobe'}
              </button>
              <button onClick={reset} disabled={saving}>
                Retake
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  )
}
