import { api } from './api.js'

const TOKEN_KEY = 'houzeey_token'
const SESSION_KEY = 'houzeey_session'

export async function register({ name, email, password, role }) {
  const { token, user } = await api.auth.register({ name, email, password, role })
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  return user
}

export async function login({ email, password }) {
  const { token, user } = await api.auth.login({ email, password })
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  return user
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(SESSION_KEY)
}

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function isLoggedIn() {
  return !!localStorage.getItem(TOKEN_KEY) && !!getSession()
}

export async function refreshSession() {
  try {
    const user = await api.auth.me()
    localStorage.setItem(SESSION_KEY, JSON.stringify(user))
    return user
  } catch {
    logout()
    return null
  }
}
