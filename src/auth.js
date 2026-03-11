// Simple localStorage auth — swap for real backend calls later

const USERS_KEY = 'houzeey_users'
const SESSION_KEY = 'houzeey_session'

function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || [] } catch { return [] }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export function register({ name, email, password, role }) {
  const users = getUsers()
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return { ok: false, error: 'An account with that email already exists.' }
  }
  const user = { id: Date.now().toString(), name, email: email.toLowerCase(), password, role }
  saveUsers([...users, user])
  const session = { id: user.id, name: user.name, email: user.email, role: user.role }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return { ok: true, user: session }
}

export function login({ email, password }) {
  const users = getUsers()
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password)
  if (!user) return { ok: false, error: 'Incorrect email or password.' }
  const session = { id: user.id, name: user.name, email: user.email, role: user.role }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return { ok: true, user: session }
}

export function logout() {
  localStorage.removeItem(SESSION_KEY)
}

export function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null } catch { return null }
}

export function isLoggedIn() {
  return !!getSession()
}
