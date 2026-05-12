import { describe, it, expect } from 'vitest'
import { isRequired, isValidEmail } from './validation'

describe('isRequired', () => {
  it('returns false for empty string', () => {
    expect(isRequired('')).toBe(false)
  })

  it('returns false for whitespace-only string', () => {
    expect(isRequired('   ')).toBe(false)
  })

  it('returns true for non-empty string', () => {
    expect(isRequired('hello')).toBe(true)
  })

  it('returns true for string with surrounding spaces', () => {
    expect(isRequired('  a  ')).toBe(true)
  })

  it('returns false for null', () => {
    expect(isRequired(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isRequired(undefined)).toBe(false)
  })

  it('returns false for number', () => {
    expect(isRequired(42)).toBe(false)
  })
})

describe('isValidEmail', () => {
  it('returns true for a valid email', () => {
    expect(isValidEmail('user@example.com')).toBe(true)
  })

  it('trims whitespace before validating', () => {
    expect(isValidEmail('  user@example.com  ')).toBe(true)
  })

  it('returns false for missing @', () => {
    expect(isValidEmail('notanemail')).toBe(false)
  })

  it('returns false for missing local part', () => {
    expect(isValidEmail('@example.com')).toBe(false)
  })

  it('returns false for missing domain', () => {
    expect(isValidEmail('user@')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isValidEmail('')).toBe(false)
  })

  it('returns false for whitespace only', () => {
    expect(isValidEmail('   ')).toBe(false)
  })
})
