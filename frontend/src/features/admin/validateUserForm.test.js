import { describe, it, expect } from 'vitest'
import { validateUserForm } from './validateUserForm'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_CREATE = { full_name: 'ישראל ישראלי', email: 'israel@example.com', password: 'Abcdef1!' }
const VALID_EDIT   = { full_name: 'ישראל ישראלי', email: 'israel@example.com', password: '' }

// ─── full_name ────────────────────────────────────────────────────────────────

describe('full_name validation', () => {
  it('returns error when full_name is empty', () => {
    const { valid, errors } = validateUserForm({ ...VALID_CREATE, full_name: '' }, true)
    expect(valid).toBe(false)
    expect(errors.full_name).toBe('שדה חובה')
  })

  it('returns error when full_name is whitespace only', () => {
    const { errors } = validateUserForm({ ...VALID_CREATE, full_name: '   ' }, true)
    expect(errors.full_name).toBe('שדה חובה')
  })

  it('passes when full_name is provided', () => {
    const { errors } = validateUserForm(VALID_CREATE, true)
    expect(errors.full_name).toBeUndefined()
  })
})

// ─── email ────────────────────────────────────────────────────────────────────

describe('email validation', () => {
  it('returns error when email is empty', () => {
    const { valid, errors } = validateUserForm({ ...VALID_CREATE, email: '' }, true)
    expect(valid).toBe(false)
    expect(errors.email).toBe('שדה חובה')
  })

  it('returns format error when email is malformed', () => {
    const { errors } = validateUserForm({ ...VALID_CREATE, email: 'not-an-email' }, true)
    expect(errors.email).toBe('אימייל לא תקין')
  })

  it('returns format error when email has no domain', () => {
    const { errors } = validateUserForm({ ...VALID_CREATE, email: 'user@' }, true)
    expect(errors.email).toBe('אימייל לא תקין')
  })

  it('passes when email is valid', () => {
    const { errors } = validateUserForm(VALID_CREATE, true)
    expect(errors.email).toBeUndefined()
  })
})

// ─── password — create mode ───────────────────────────────────────────────────

describe('password validation — create mode', () => {
  it('returns required error when password is empty', () => {
    const { valid, errors } = validateUserForm({ ...VALID_CREATE, password: '' }, true)
    expect(valid).toBe(false)
    expect(errors.password).toBe('שדה חובה')
  })

  it('returns complexity error for short password', () => {
    const { errors } = validateUserForm({ ...VALID_CREATE, password: 'Ab1!' }, true)
    expect(errors.password).toMatch('לפחות 8 תווים')
  })

  it('returns complexity error when uppercase is missing', () => {
    const { errors } = validateUserForm({ ...VALID_CREATE, password: 'abcdef1!' }, true)
    expect(errors.password).toMatch('אות גדולה אחת לפחות')
  })

  it('returns complexity error when lowercase is missing', () => {
    const { errors } = validateUserForm({ ...VALID_CREATE, password: 'ABCDEF1!' }, true)
    expect(errors.password).toMatch('אות קטנה אחת לפחות')
  })

  it('returns complexity error when digit is missing', () => {
    const { errors } = validateUserForm({ ...VALID_CREATE, password: 'Abcdefgh!' }, true)
    expect(errors.password).toMatch('ספרה אחת לפחות')
  })

  it('returns complexity error when special character is missing', () => {
    const { errors } = validateUserForm({ ...VALID_CREATE, password: 'Abcdef12' }, true)
    expect(errors.password).toMatch('תו מיוחד אחד לפחות')
  })

  it('lists multiple missing rules in a single message', () => {
    const { errors } = validateUserForm({ ...VALID_CREATE, password: 'abc' }, true)
    expect(errors.password).toMatch('לפחות 8 תווים')
    expect(errors.password).toMatch('אות גדולה אחת לפחות')
    expect(errors.password).toMatch('ספרה אחת לפחות')
    expect(errors.password).toMatch('תו מיוחד אחד לפחות')
  })

  it('passes when password meets all complexity rules', () => {
    const { errors } = validateUserForm(VALID_CREATE, true)
    expect(errors.password).toBeUndefined()
  })
})

// ─── password — edit mode ─────────────────────────────────────────────────────

describe('password validation — edit mode', () => {
  it('does not require password when field is empty', () => {
    const { valid, errors } = validateUserForm(VALID_EDIT, false)
    expect(valid).toBe(true)
    expect(errors.password).toBeUndefined()
  })

  it('validates complexity when a non-empty password is provided', () => {
    const { valid, errors } = validateUserForm({ ...VALID_EDIT, password: 'weak' }, false)
    expect(valid).toBe(false)
    expect(errors.password).toMatch('הסיסמה חייבת לכלול:')
  })

  it('passes when provided password meets all complexity rules', () => {
    const { errors } = validateUserForm({ ...VALID_EDIT, password: 'NewPass1!' }, false)
    expect(errors.password).toBeUndefined()
  })

  it('passes with whitespace-only password (treated as empty — no change)', () => {
    const { errors } = validateUserForm({ ...VALID_EDIT, password: '   ' }, false)
    expect(errors.password).toBeUndefined()
  })
})

// ─── valid object ─────────────────────────────────────────────────────────────

describe('overall valid flag', () => {
  it('returns valid=true when all create fields are correct', () => {
    const { valid } = validateUserForm(VALID_CREATE, true)
    expect(valid).toBe(true)
  })

  it('returns valid=true when all edit fields are correct with empty password', () => {
    const { valid } = validateUserForm(VALID_EDIT, false)
    expect(valid).toBe(true)
  })

  it('returns valid=false and collects all errors at once', () => {
    const { valid, errors } = validateUserForm({ full_name: '', email: '', password: '' }, true)
    expect(valid).toBe(false)
    expect(errors.full_name).toBe('שדה חובה')
    expect(errors.email).toBe('שדה חובה')
    expect(errors.password).toBe('שדה חובה')
  })

  it('returns empty errors object when valid', () => {
    const { errors } = validateUserForm(VALID_CREATE, true)
    expect(Object.keys(errors)).toHaveLength(0)
  })
})
