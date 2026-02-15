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

function updateAuthUI(session) {
  const openButton = document.querySelector('#auth-open-btn')
  const logoutButton = document.querySelector('#logout-btn')

  if (!openButton || !logoutButton) return

  if (session?.user) {
    openButton.classList.add('d-none')
    logoutButton.classList.remove('d-none')
  } else {
    openButton.classList.remove('d-none')
    logoutButton.classList.add('d-none')
  }
}

async function register(email, password) {
  if (!supabase) {
    setStatus(missingConfigMessage, 'error')
    return
  }

  try {
    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setStatus(error.message, 'error')
      return
    }

    setStatus('Registration successful. Check your email for confirmation.', 'success')
  } catch (error) {
    setStatus(getAuthErrorMessage(error), 'error')
  }
}

async function login(email, password) {
  if (!supabase) {
    setStatus(missingConfigMessage, 'error')
    return
  }

  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password })

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
    const email = registerForm.querySelector('#register-email').value.trim()
    const password = registerForm.querySelector('#register-password').value
    await register(email, password)
  })

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    const email = loginForm.querySelector('#login-email').value.trim()
    const password = loginForm.querySelector('#login-password').value
    await login(email, password)
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
