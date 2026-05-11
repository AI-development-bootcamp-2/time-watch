import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLoginForm } from '../../hooks/useLoginForm'
import InlineError from '../../components/InlineError'
import { IconEmail, IconLock, IconEye, IconEyeOff } from '../../components/icons'
import './LoginPage.css'

export default function LoginForm() {
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)

  const form = useLoginForm({
    onSubmit: (email, password) => login(email, password),
  })

  return (
    <form
      className="login-card"
      onSubmit={form.handleSubmit}
      dir="rtl"
      noValidate
    >
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

        <div className="login-field">
          <label htmlFor="email">אימייל</label>
          <div className="login-input-wrap">
            <input
              id="email"
              name="email"
              type="email"
              dir="rtl"
              className="login-input"
              value={form.email}
              onChange={form.handleChange}
              ref={form.emailRef}
              autoComplete="email"
              aria-invalid={!!form.errors.email}
              aria-describedby={form.errors.email ? 'email-error' : undefined}
            />
            <span className="login-input-icon">
              <IconEmail />
            </span>
          </div>
          <InlineError id="email-error" message={form.errors.email} />
        </div>

        <div className="login-field">
          <label htmlFor="password">סיסמה</label>
          <div className="login-input-wrap">
            <button
              type="button"
              className="login-pw-toggle"
              aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
              onClick={() => setShowPassword(prev => !prev)}
            >
              {showPassword ? <IconEyeOff /> : <IconEye />}
            </button>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              dir="rtl"
              className="login-input"
              value={form.password}
              onChange={form.handleChange}
              ref={form.passwordRef}
              autoComplete="current-password"
              aria-invalid={!!form.errors.password}
              aria-describedby={form.errors.password ? 'password-error' : undefined}
            />
            <span className="login-input-icon">
              <IconLock />
            </span>
          </div>
          <InlineError id="password-error" message={form.errors.password} />
        </div>

        <InlineError id="form-error" message={form.errors.form} />

        <button
          type="submit"
          className="login-submit"
          disabled={form.isSubmitting}
        >
          {form.isSubmitting ? 'מתחבר...' : 'כניסה'}
        </button>

      </div>
    </form>
  )
}
