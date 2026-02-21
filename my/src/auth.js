import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from './config.js'

const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()
const hasConfig =
  Boolean(supabaseUrl && supabaseAnonKey) &&
  !/your-project-ref|your-anon-key|your-publishable-key/i.test(`${supabaseUrl} ${supabaseAnonKey}`)
const supabase = hasConfig ? createClient(supabaseUrl, supabaseAnonKey) : null
const missingConfigMessage =
  'Supabase config is missing or still using placeholders. In my/.env set VITE_SUPABASE_URL and either VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY, then restart the dev server.'

function getAuthErrorMessage(error) {
  if (error instanceof TypeError && /fetch/i.test(error.message)) {
    return 'Cannot reach Supabase. Check your URL/key in my/.env and make sure they are real project values.'
  }

  return error?.message || 'Authentication failed. Please try again.'
}

function setStatus(message, type = 'info') {
  const statusElement = document.querySelector('#auth-status')
  if (!statusElement) return

  statusElement.textContent = message
  statusElement.dataset.type = type
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

function normalizePhone(value) {
  return String(value || '').replace(/\s+/g, '')
}

function isLikelyPhone(value) {
  return /^\+?[0-9]{7,20}$/.test(normalizePhone(value))
}

async function updateAuthUI(session) {
  const openButton = document.querySelector('#auth-open-btn')
  const logoutButton = document.querySelector('#logout-btn')
  const adminButton = document.querySelector('#admin-btn')

  if (!openButton || !logoutButton) return

  if (session?.user) {
    openButton.classList.add('d-none')
    logoutButton.classList.remove('d-none')
    
    // Check if user is admin and show/hide admin button
    if (adminButton) {
      const isAdmin = await checkUserIsAdmin()
      if (isAdmin) {
        adminButton.classList.remove('d-none')
      } else {
        adminButton.classList.add('d-none')
      }
    }
  } else {
    openButton.classList.remove('d-none')
    logoutButton.classList.add('d-none')
    if (adminButton) {
      adminButton.classList.add('d-none')
    }
  }
}

async function register(username, contact, password) {
  if (!supabase) {
    setStatus(missingConfigMessage, 'error')
    return
  }

  const normalizedUsername = String(username || '').trim()
  const normalizedContact = String(contact || '').trim()
  const normalizedPhone = normalizePhone(normalizedContact)

  if (!normalizedUsername) {
    setStatus('Username is required.', 'error')
    return
  }

  if (!normalizedContact) {
    setStatus('Phone number or email is required.', 'error')
    return
  }

  const isContactEmail = isEmail(normalizedContact)
  const isContactPhone = !isContactEmail && isLikelyPhone(normalizedContact)

  if (!isContactEmail && !isContactPhone) {
    setStatus('Enter a valid phone number or email.', 'error')
    return
  }

  try {
    const payload = isContactEmail
      ? {
          email: normalizedContact.toLowerCase(),
          password,
          options: {
            data: {
              username: normalizedUsername,
              full_name: normalizedUsername,
              contact: normalizedContact.toLowerCase()
            }
          }
        }
      : {
          phone: normalizedPhone,
          password,
          options: {
            data: {
              username: normalizedUsername,
              full_name: normalizedUsername,
              contact: normalizedPhone
            }
          }
        }

    const { error } = await supabase.auth.signUp(payload)

    if (error) {
      setStatus(error.message, 'error')
      return
    }

    setStatus('Registration successful. Verify your contact method if required.', 'success')
  } catch (error) {
    setStatus(getAuthErrorMessage(error), 'error')
  }
}

async function login(contact, password) {
  if (!supabase) {
    setStatus(missingConfigMessage, 'error')
    return
  }

  const normalizedContact = String(contact || '').trim()
  const isContactEmail = isEmail(normalizedContact)
  const isContactPhone = !isContactEmail && isLikelyPhone(normalizedContact)

  if (!isContactEmail && !isContactPhone) {
    setStatus('Enter a valid phone number or email.', 'error')
    return
  }

  try {
    const credentials = isContactEmail
      ? { email: normalizedContact.toLowerCase(), password }
      : { phone: normalizePhone(normalizedContact), password }

    const { error } = await supabase.auth.signInWithPassword(credentials)

    if (error) {
      setStatus(error.message, 'error')
      return
    }

    setStatus('Login successful. Welcome back.', 'success')
  } catch (error) {
    setStatus(getAuthErrorMessage(error), 'error')
  }
}

async function logout() {
  if (!supabase) {
    setStatus(missingConfigMessage, 'error')
    return
  }

  try {
    const { error } = await supabase.auth.signOut()
    if (error) {
      setStatus(error.message, 'error')
      return
    }

    setStatus('You are logged out.', 'info')
  } catch (error) {
    setStatus(getAuthErrorMessage(error), 'error')
  }
}

export async function checkUserIsAdmin() {
  if (!supabase) {
    return false
  }

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !sessionData.session) {
      return false
    }

    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('user_role')
      .eq('user_id', sessionData.session.user.id)
      .single()

    if (roleError) {
      return false
    }

    return roleData.user_role === 'admin'
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

export function getSupabaseClient() {
  return supabase
}

export function initAuth() {
  const modalElement = document.querySelector('#authModal')
  const openModalButton = document.querySelector('#auth-open-btn')
  const heroAuthButton = document.querySelector('#hero-auth-btn')
  const registerForm = document.querySelector('#register-form')
  const loginForm = document.querySelector('#login-form')
  const logoutButton = document.querySelector('#logout-btn')

  if (!modalElement || !openModalButton || !registerForm || !loginForm || !logoutButton) {
    return
  }

  const bootstrapModal = window.bootstrap?.Modal
  const modal = bootstrapModal ? new bootstrapModal(modalElement) : null

  openModalButton.addEventListener('click', () => {
    if (modal) {
      modal.show()
    }
  })

  heroAuthButton?.addEventListener('click', () => {
    if (modal) {
      modal.show()
    }
  })

  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    const username = registerForm.querySelector('#register-username').value.trim()
    const contact = registerForm.querySelector('#register-contact').value.trim()
    const password = registerForm.querySelector('#register-password').value
    await register(username, contact, password)
  })

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    const contact = loginForm.querySelector('#login-contact').value.trim()
    const password = loginForm.querySelector('#login-password').value
    await login(contact, password)
  })

  logoutButton.addEventListener('click', logout)

  if (!supabase) {
    updateAuthUI(null)
    return
  }

  supabase.auth.getSession().then(({ data }) => {
    updateAuthUI(data.session)
  })

  supabase.auth.onAuthStateChange((_event, session) => {
    updateAuthUI(session)
  })
}
