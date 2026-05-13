import { isRequired, isValidEmail } from '../../utils/validation'

// Complexity rules applied when creating a user or when a non-empty password is supplied in edit mode
function validatePassword(password: string): string[] {
  const missing: string[] = []
  if (password.length < 8)              missing.push('לפחות 8 תווים')
  if (!/[A-Z]/.test(password))          missing.push('אות גדולה אחת לפחות')
  if (!/[a-z]/.test(password))          missing.push('אות קטנה אחת לפחות')
  if (!/\d/.test(password))             missing.push('ספרה אחת לפחות')
  if (!/[^A-Za-z0-9]/.test(password))  missing.push('תו מיוחד אחד לפחות')
  return missing
}

// Validates user form fields; isCreate=true requires password and enforces complexity
export function validateUserForm(
  { full_name = '', email = '', password = '' }: { full_name?: string; email?: string; password?: string } = {},
  isCreate: boolean
): { valid: boolean; errors: { full_name?: string; email?: string; password?: string } } {
  const errors: { full_name?: string; email?: string; password?: string } = {}

  if (!isRequired(full_name)) {
    errors.full_name = 'שדה חובה'
  }

  if (!isRequired(email)) {
    errors.email = 'שדה חובה'
  } else if (!isValidEmail(email)) {
    errors.email = 'אימייל לא תקין'
  }

  if (isCreate) {
    if (!isRequired(password)) {
      errors.password = 'שדה חובה'
    } else {
      const missing = validatePassword(password)
      if (missing.length > 0) {
        errors.password = `הסיסמה חייבת לכלול: ${missing.join(', ')}`
      }
    }
  } else if (isRequired(password)) {
    // Edit mode: only validate complexity when a new password is entered
    const missing = validatePassword(password)
    if (missing.length > 0) {
      errors.password = `הסיסמה חייבת לכלול: ${missing.join(', ')}`
    }
  }

  return { valid: Object.keys(errors).length === 0, errors }
}
