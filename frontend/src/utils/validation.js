export function isRequired(value) {
  return typeof value === 'string' && value.trim().length > 0
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}
