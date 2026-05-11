import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLoginForm } from '../../hooks/useLoginForm'
import './LoginPage.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const auth = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)

  const form = useLoginForm({
    onSubmit: (email, password) => auth.login(email, password),
    onSuccess: () => navigate('/', { replace: true }),
  })

  useEffect(() => {
    if (auth.user) navigate('/', { replace: true })
  }, [auth.user])

  return (
    <div className="login-page">
<form className="login-card" onSubmit={form.handleSubmit}>

        <img
          src="/abra-logo.png"
          alt="abra"
          className="login-logo"
        />

        <h1 className="login-welcome">
          👋 ברוכים הבאים למערכת<br />
          הניהול של אברא
        </h1>

        <div className="login-form">

          {/* Email */}
          <div className="login-field">
            <label htmlFor="email">אימייל</label>
            <div className="login-input-wrap">
              <span className="login-input-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <polyline points="3 7 12 13 21 7" />
                </svg>
              </span>
              <input
                id="email"
                className="login-input"
                type="email"
                name="email"
                placeholder="name@abra.co.il"
                autoComplete="email"
                value={form.email}
                onChange={form.handleChange}
                ref={form.emailRef}
              />
            </div>
            {form.errors.email && <p className="login-error" aria-live="polite">{form.errors.email}</p>}
          </div>

          {/* Password */}
          <div className="login-field">
            <label htmlFor="password">סיסמה</label>
            <div className="login-input-wrap">
              <span className="login-input-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="11" width="16" height="10" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
              </span>
              <input
                id="password"
                className="login-input"
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={form.password}
                onChange={form.handleChange}
                ref={form.passwordRef}
              />
              <button
                type="button"
                className="login-pw-toggle"
                onClick={() => setShowPassword(v => !v)}
                aria-label="הצג סיסמה"
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {form.errors.password && <p className="login-error" aria-live="polite">{form.errors.password}</p>}
          </div>

          {/* Remember me */}
          <div className="login-row">
            <label className="login-remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
              />
              <span className={`login-checkbox-box${remember ? ' is-checked' : ''}`} />
              <span>זכור אותי</span>
            </label>
          </div>

          {form.errors.form && <p className="login-error" aria-live="polite">{form.errors.form}</p>}

          <button type="submit" className="login-submit" disabled={form.isSubmitting}>
            {form.isSubmitting ? '...' : 'כניסה'}
          </button>

        </div>
      </form>
    </div>
  )
}
