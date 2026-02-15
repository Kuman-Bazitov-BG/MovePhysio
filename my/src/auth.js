import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from './config.js'

const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()
const hasConfig = Boolean(supabaseUrl && supabaseAnonKey)
const supabase = hasConfig ? createClient(supabaseUrl, supabaseAnonKey) : null

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
    setStatus('Supabase config is missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.', 'error')
    return
  }

  const { error } = await supabase.auth.signUp({ email, password })

  if (error) {
    setStatus(error.message, 'error')
    return
  }

  setStatus('Registration successful. Check your email for confirmation.', 'success')
}

async function login(email, password) {
  if (!supabase) {
    setStatus('Supabase config is missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.', 'error')
    return
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    setStatus(error.message, 'error')
    return
  }

  setStatus('Login successful. Welcome back.', 'success')
}

async function logout() {
  if (!supabase) {
    setStatus('Supabase config is missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.', 'error')
    return
  }

  const { error } = await supabase.auth.signOut()
  if (error) {
    setStatus(error.message, 'error')
    return
  }

  setStatus('You are logged out.', 'info')
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
