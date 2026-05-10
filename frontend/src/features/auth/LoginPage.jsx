import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './LoginPage.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (localStorage.getItem('authToken')) {
      navigate('/', { replace: true })
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { email, password } = Object.fromEntries(new FormData(e.target))
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (res.ok) {
        const { token } = await res.json()
        localStorage.setItem('authToken', token)
        navigate('/', { replace: true })
      } else if (res.status === 401) {
        setError('האימייל או הסיסמה שגויים')
      } else if (res.status === 423) {
        setError('החשבון ננעל עקב ניסיונות התחברות מרובים')
      }
    } catch {
      setError('אירעה שגיאה. נסי שוב מאוחר יותר')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <svg className="login-logo-icon" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 4L28 26H4L16 4Z" fill="#e8533a" />
          </svg>
          <span className="login-logo-text">abra</span>
        </div>
        <p className="login-welcome">ברוכים הבאים למערכת</p>
        <p className="login-subtitle">הניהול של אברא</p>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="email">דואר אלקטרוני</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="name@company.com"
            />
          </div>
          <div className="login-field">
            <label htmlFor="password">סיסמה</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="login-error" aria-live="polite">{error}</p>}
          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? '...' : 'התחבר'}
          </button>
        </form>
      </div>
    </div>
  )
}
