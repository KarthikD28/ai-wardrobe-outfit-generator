import { type FormEvent, useState } from 'react'
import { useAuth } from '../auth'
import { Segmented } from '../components/Segmented'
import { GENDERS, type Gender } from '../types'

export function AuthPage() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [gender, setGender] = useState<Gender>('male')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'register') await register(email, password, gender)
      else await login(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const registering = mode === 'register'

  return (
    <div className="auth">
      <form className="card auth-card" onSubmit={submit}>
        <h1>Wardrobe AI</h1>
        <p className="muted">
          {registering ? 'Create an account to start your wardrobe.' : 'Sign in to your wardrobe.'}
        </p>

        <label className="field">
          <span className="field-label">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label className="field">
          <span className="field-label">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={registering ? 'new-password' : 'current-password'}
            minLength={registering ? 8 : undefined}
            required
          />
          {registering && <span className="hint">At least 8 characters</span>}
        </label>
        {registering && (
          <Segmented label="I shop for" options={GENDERS} value={gender} onChange={setGender} />
        )}

        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy}>
          {busy ? 'Please wait…' : registering ? 'Create account' : 'Sign in'}
        </button>
        <button
          type="button"
          className="link"
          onClick={() => {
            setMode(registering ? 'login' : 'register')
            setError('')
          }}
        >
          {registering ? 'I already have an account' : 'Create a new account'}
        </button>
      </form>
    </div>
  )
}
