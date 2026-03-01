import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from './config.js'
import { teardownSiteChat } from './chat.js'

const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()
const hasConfig =
  Boolean(supabaseUrl && supabaseAnonKey) &&
  !/your-project-ref|your-anon-key|your-publishable-key/i.test(`${supabaseUrl} ${supabaseAnonKey}`)
const supabase = hasConfig ? createClient(supabaseUrl, supabaseAnonKey) : null
const missingConfigMessage =
  'Supabase config is missing or still using placeholders. In my/.env.local set VITE_SUPABASE_URL and either VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY, then restart the dev server.'

function getAuthErrorMessage(error) {
  if (error instanceof TypeError && /fetch/i.test(error.message)) {
    return 'Cannot reach Supabase. Check your URL/key in my/.env.local and make sure they are real project values.'
  }

  return error?.message || 'Authentication failed. Please try again.'
}

function setStatus(message, type = 'info', targetId) {
  const statusElement = document.querySelector(`#${targetId}`)
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

function refreshToHomePage() {
  if (window.location.pathname !== '/') {
    window.location.assign('/')
    return
  }

  window.location.reload()
}

function closeAuthModal(modalId) {
  const modalElement = document.querySelector(`#${modalId}`)
  if (!modalElement) return

  const bootstrapModal = window.bootstrap?.Modal
  if (!bootstrapModal) return

  const instance = bootstrapModal.getInstance(modalElement)
  instance?.hide()
}

function getUserDisplayName(user) {
  const metadata = user?.user_metadata || {}
  const displayName =
    user?.email ||
    (isEmail(metadata.contact) ? metadata.contact : '') ||
    metadata.full_name ||
    metadata.username ||
    user?.phone ||
    'Account'

  return String(displayName).trim()
}

function completeAuthFlow(modalId) {
  closeAuthModal(modalId)
  refreshToHomePage()
}

function resetFormState(formElement, statusId) {
  if (!formElement) return
  formElement.reset()
  if (statusId) {
    setStatus('', 'info', statusId)
  }
}

function isRegisteredSessionUser(user) {
  return Boolean(user?.id) && !Boolean(user?.is_anonymous)
}

async function updateAuthUI(session) {
  const registerButton = document.querySelector('#register-open-btn')
  const loginButton = document.querySelector('#login-open-btn')
  const logoutButton = document.querySelector('#logout-btn')
  const adminButton = document.querySelector('#admin-btn')
  const authUserPill = document.querySelector('#auth-user-pill')
  const chatToggleButton = document.querySelector('#chat-toggle-btn')
  const authActions = document.querySelector('.auth-actions')

  if (!registerButton || !loginButton || !logoutButton) return

  if (session?.user) {
    registerButton.classList.add('d-none')
    loginButton.classList.add('d-none')
    logoutButton.classList.add('d-none')

    const isAdmin = await checkUserIsAdmin()
    const isRegisteredUser = isRegisteredSessionUser(session.user)

    if (authUserPill) {
      authUserPill.textContent = getUserDisplayName(session.user)
      authUserPill.classList.remove('d-none')
    }
    
    if (adminButton) {
      if (isAdmin) {
        adminButton.classList.remove('d-none')
      } else {
        adminButton.classList.add('d-none')
      }
    }

    if (chatToggleButton) {
      if (isRegisteredUser) {
        chatToggleButton.classList.remove('d-none')
      } else {
        chatToggleButton.classList.add('d-none')
        teardownSiteChat()
      }
    }

    if (authActions) {
      authActions.classList.toggle('is-admin-chat-stacked', isAdmin)
    }
  } else {
    registerButton.classList.remove('d-none')
    loginButton.classList.remove('d-none')
    logoutButton.classList.add('d-none')
    if (authUserPill) {
      authUserPill.textContent = ''
      authUserPill.classList.add('d-none')
    }
    if (adminButton) {
      adminButton.classList.add('d-none')
    }
    if (chatToggleButton) {
      chatToggleButton.classList.add('d-none')
    }
    teardownSiteChat()

    if (authActions) {
      authActions.classList.remove('is-admin-chat-stacked')
    }
  }
}

async function register(username, contact, password) {
  if (!supabase) {
    setStatus(missingConfigMessage, 'error', 'register-status')
    return
  }

  const normalizedUsername = String(username || '').trim()
  const normalizedContact = String(contact || '').trim()
  const normalizedPhone = normalizePhone(normalizedContact)

  if (!normalizedUsername) {
    setStatus('Username is required.', 'error', 'register-status')
    return
  }

  if (!normalizedContact) {
    setStatus('Phone number or email is required.', 'error', 'register-status')
    return
  }

  const isContactEmail = isEmail(normalizedContact)
  const isContactPhone = !isContactEmail && isLikelyPhone(normalizedContact)

  if (!isContactEmail && !isContactPhone) {
    setStatus('Enter a valid phone number or email.', 'error', 'register-status')
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
      setStatus(error.message, 'error', 'register-status')
      return
    }

    setStatus('Registration successful. Verify your contact method if required.', 'success', 'register-status')
    completeAuthFlow('registerModal')
  } catch (error) {
    setStatus(getAuthErrorMessage(error), 'error', 'register-status')
  }
}

async function login(contact, password) {
  if (!supabase) {
    setStatus(missingConfigMessage, 'error', 'login-status')
    return
  }

  const normalizedContact = String(contact || '').trim()
  const isContactEmail = isEmail(normalizedContact)
  const isContactPhone = !isContactEmail && isLikelyPhone(normalizedContact)

  if (!isContactEmail && !isContactPhone) {
    setStatus('Enter a valid phone number or email.', 'error', 'login-status')
    return
  }

  try {
    const credentials = isContactEmail
      ? { email: normalizedContact.toLowerCase(), password }
      : { phone: normalizePhone(normalizedContact), password }

    const { error } = await supabase.auth.signInWithPassword(credentials)

    if (error) {
      setStatus(error.message, 'error', 'login-status')
      return
    }

    setStatus('Login successful. Welcome back.', 'success', 'login-status')
    completeAuthFlow('loginModal')
  } catch (error) {
    setStatus(getAuthErrorMessage(error), 'error', 'login-status')
  }
}

async function logout() {
  if (!supabase) {
    // console.error(missingConfigMessage)
    return
  }

  try {
    const { error } = await supabase.auth.signOut()
    if (error) {
      // console.error(error.message)
      return
    }

    refreshToHomePage()
  } catch (error) {
    // console.error(getAuthErrorMessage(error))
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
  const loginModalElement = document.querySelector('#loginModal')
  const registerModalElement = document.querySelector('#registerModal')
  const sessionActionsModalElement = document.querySelector('#sessionActionsModal')
  const registerOpenBtn = document.querySelector('#register-open-btn')
  const loginOpenBtn = document.querySelector('#login-open-btn')
  const authUserPill = document.querySelector('#auth-user-pill')
  const registerForm = document.querySelector('#register-form')
  const loginForm = document.querySelector('#login-form')
  const logoutButton = document.querySelector('#logout-btn')
  const keepLoginButton = document.querySelector('#session-keep-login-btn')
  const sessionLogoutConfirmButton = document.querySelector('#session-logout-confirm-btn')
  const switchToLogin = document.querySelector('#switch-to-login')
  const switchToRegister = document.querySelector('#switch-to-register')

  if (!loginModalElement || !registerModalElement || !registerOpenBtn || !loginOpenBtn || !registerForm || !loginForm || !logoutButton) {
    return
  }

  const bootstrapModal = window.bootstrap?.Modal
  const loginModal = bootstrapModal ? new bootstrapModal(loginModalElement) : null
  const registerModal = bootstrapModal ? new bootstrapModal(registerModalElement) : null
  const sessionActionsModal = bootstrapModal && sessionActionsModalElement ? new bootstrapModal(sessionActionsModalElement) : null

  registerOpenBtn.addEventListener('click', () => {
    resetFormState(registerForm, 'register-status')
    if (registerModal) registerModal.show()
  })

  loginOpenBtn.addEventListener('click', () => {
    if (loginModal) loginModal.show()
  })

  authUserPill?.addEventListener('click', () => {
    if (sessionActionsModal) {
      sessionActionsModal.show()
    }
  })

  keepLoginButton?.addEventListener('click', () => {
    if (sessionActionsModal) {
      sessionActionsModal.hide()
    }
  })

  switchToLogin?.addEventListener('click', (e) => {
    e.preventDefault()
    if (registerModal && loginModal) {
      registerModal.hide()
      loginModal.show()
    }
  })

  switchToRegister?.addEventListener('click', (e) => {
    e.preventDefault()
    resetFormState(registerForm, 'register-status')
    if (loginModal && registerModal) {
      loginModal.hide()
      registerModal.show()
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

  sessionLogoutConfirmButton?.addEventListener('click', async () => {
    if (sessionActionsModal) {
      sessionActionsModal.hide()
    }
    await logout()
  })

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
