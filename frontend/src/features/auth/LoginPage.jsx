import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './LoginPage.css'

export default function LoginPage() {
  const navigate = useNavigate()

  useEffect(() => {
    if (localStorage.getItem('authToken')) {
      navigate('/', { replace: true })
    }
  }, [])

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
        <form className="login-form">
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
          <p className="login-error" aria-live="polite"></p>
          <button type="submit" className="login-submit">התחבר</button>
        </form>
      </div>
    </div>
  )
}
