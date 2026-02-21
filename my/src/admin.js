import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from './config.js'

const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()
const hasConfig =
  Boolean(supabaseUrl && supabaseAnonKey) &&
  !/your-project-ref|your-anon-key|your-publishable-key/i.test(`${supabaseUrl} ${supabaseAnonKey}`)
const supabase = hasConfig ? createClient(supabaseUrl, supabaseAnonKey) : null

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

async function checkAdminAccess() {
  if (!supabase) {
    return { isAdmin: false, error: 'Supabase not configured' }
  }

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !sessionData.session) {
      return { isAdmin: false, error: 'Not authenticated' }
    }

    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('user_role')
      .eq('user_id', sessionData.session.user.id)
      .single()

    if (roleError) {
      return { isAdmin: false, error: 'No role found' }
    }

    return { isAdmin: roleData.user_role === 'admin', error: null }
  } catch (error) {
    return { isAdmin: false, error: error.message }
  }
}

function renderAccessDenied() {
  return `
    <div class="access-denied">
      <i class="bi bi-shield-exclamation access-denied-icon"></i>
      <h1>Access Denied</h1>
      <p>You do not have permission to access the admin panel.</p>
      <p>This area is restricted to administrators only.</p>
      <a href="/" class="btn-home">
        <i class="bi bi-house-door me-2"></i>Return to Home
      </a>
    </div>
  `
}

async function loadUsersList() {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('user_id, user_role, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading users:', error)
      return []
    }

    const usersWithEmails = await Promise.all(
      data.map(async (userRole) => {
        try {
          const { data: userData } = await supabase.auth.admin.getUserById(userRole.user_id)
          return {
            ...userRole,
            email: userData?.user?.email || userRole.user_id
          }
        } catch {
          return {
            ...userRole,
            email: userRole.user_id
          }
        }
      })
    )

    return usersWithEmails
  } catch (error) {
    console.error('Error loading users:', error)
    return []
  }
}

async function getUsersCount() {
  if (!supabase) return 0

  try {
    const { count, error } = await supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.error('Error getting users count:', error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error('Error getting users count:', error)
    return 0
  }
}

async function getAdminsCount() {
  if (!supabase) return 0

  try {
    const { count, error } = await supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('user_role', 'admin')

    if (error) {
      console.error('Error getting admins count:', error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error('Error getting admins count:', error)
    return 0
  }
}

async function getAppointmentsCount() {
  if (!supabase) return 0

  try {
    const { count, error } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })

    if (error) return 0
    return count || 0
  } catch {
    return 0
  }
}

async function loadAppointmentConfigurations() {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('appointment_configurations')
      .select('service, slot_minutes, work_start_hour, work_end_hour, allow_weekends, max_appointments_per_slot, updated_at')
      .order('service', { ascending: true })

    if (error) {
      console.error('Error loading appointment configurations:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error loading appointment configurations:', error)
    return []
  }
}

async function updateAppointmentConfiguration(service, payload, userId) {
  if (!supabase) return { success: false, error: 'Supabase not configured' }

  try {
    const { error } = await supabase
      .from('appointment_configurations')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
        updated_by: userId
      })
      .eq('service', service)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function loadAppointmentsAdmin() {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('id, service, title, notes, appointment_at, created_at')
      .order('appointment_at', { ascending: true })

    if (error) {
      console.error('Error loading appointments:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error loading appointments:', error)
    return []
  }
}

async function createAppointmentAdmin(payload, userId) {
  if (!supabase) return { success: false, error: 'Supabase not configured' }

  try {
    const { error } = await supabase
      .from('appointments')
      .insert({
        ...payload,
        created_by: userId
      })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function updateAppointmentAdmin(appointmentId, payload) {
  if (!supabase) return { success: false, error: 'Supabase not configured' }

  try {
    const { error } = await supabase
      .from('appointments')
      .update({
        ...payload,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function deleteAppointmentAdmin(appointmentId) {
  if (!supabase) return { success: false, error: 'Supabase not configured' }

  try {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', appointmentId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function toggleUserRole(userId, currentRole) {
  if (!supabase) return false

  try {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    const { error } = await supabase
      .from('user_roles')
      .update({ user_role: newRole, updated_at: new Date().toISOString() })
      .eq('user_id', userId)

    if (error) {
      console.error('Error updating user role:', error)
      alert('Failed to update user role: ' + error.message)
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating user role:', error)
    alert('Failed to update user role: ' + error.message)
    return false
  }
}

async function upsertUserRole(userId, userRole) {
  if (!supabase) return { success: false, error: 'Supabase not configured' }

  try {
    const { error } = await supabase
      .from('user_roles')
      .upsert(
        {
          user_id: userId,
          user_role: userRole,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id' }
      )

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function deleteUserRole(userId) {
  if (!supabase) return { success: false, error: 'Supabase not configured' }

  try {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function toDateTimeLocal(dateString) {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 16)
}

function alignDateTimeLocal(value, slotMinutes) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime()) || !slotMinutes) return value

  const minutes = date.getMinutes()
  const alignedMinutes = Math.floor(minutes / slotMinutes) * slotMinutes
  date.setMinutes(alignedMinutes, 0, 0)

  return toDateTimeLocal(date.toISOString())
}

function isAlignedToSlot(value, slotMinutes) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime()) || !slotMinutes) return true
  return date.getMinutes() % slotMinutes === 0
}

function renderUserRow(user) {
  return `
    <tr data-user-id="${user.user_id}">
      <td>${user.email}</td>
      <td>
        <span class="role-badge ${user.user_role}">${user.user_role}</span>
      </td>
      <td>${formatDate(user.created_at)}</td>
      <td>
        <button class="action-btn edit-user-btn" data-user-id="${user.user_id}" data-current-role="${user.user_role}">
          <i class="bi bi-pencil-square me-1"></i>
          Edit
        </button>
        <button class="action-btn remove-user-btn ms-2" data-user-id="${user.user_id}">
          <i class="bi bi-trash me-1"></i>
          Remove
        </button>
      </td>
    </tr>
  `
}

function renderAppointmentConfigurationRows(configs) {
  if (!configs.length) {
    return `
      <tr>
        <td colspan="8">No appointment configuration found.</td>
      </tr>
    `
  }

  return configs
    .map((config) => `
      <tr data-service="${config.service}">
        <td>${escapeHtml(config.service)}</td>
        <td><input class="form-control form-control-sm" type="number" min="15" step="15" value="${config.slot_minutes}" data-field="slot_minutes" /></td>
        <td><input class="form-control form-control-sm" type="number" min="0" max="23" value="${config.work_start_hour}" data-field="work_start_hour" /></td>
        <td><input class="form-control form-control-sm" type="number" min="1" max="24" value="${config.work_end_hour}" data-field="work_end_hour" /></td>
        <td>
          <select class="form-select form-select-sm" data-field="allow_weekends">
            <option value="false" ${config.allow_weekends ? '' : 'selected'}>No</option>
            <option value="true" ${config.allow_weekends ? 'selected' : ''}>Yes</option>
          </select>
        </td>
        <td><input class="form-control form-control-sm" type="number" min="1" max="20" value="${config.max_appointments_per_slot}" data-field="max_appointments_per_slot" /></td>
        <td>${formatDate(config.updated_at)}</td>
        <td>
          <button type="button" class="action-btn save-config-btn" data-service="${config.service}">
            <i class="bi bi-check2-circle me-1"></i>Save
          </button>
        </td>
      </tr>
    `)
    .join('')
}

function renderAppointmentRow(appointment) {
  return `
    <tr data-appointment-id="${appointment.id}">
      <td>${escapeHtml(appointment.service)}</td>
      <td>${escapeHtml(appointment.title)}</td>
      <td>${formatDate(appointment.appointment_at)}</td>
      <td>${appointment.notes ? escapeHtml(appointment.notes) : '—'}</td>
      <td>${formatDate(appointment.created_at)}</td>
      <td>
        <button class="action-btn appointment-edit-btn" data-appointment-id="${appointment.id}">
          <i class="bi bi-pencil me-1"></i>Edit
        </button>
        <button class="action-btn appointment-delete-btn ms-2" data-appointment-id="${appointment.id}">
          <i class="bi bi-trash me-1"></i>Delete
        </button>
      </td>
    </tr>
  `
}

async function renderAdminPanel() {
  const usersCount = await getUsersCount()
  const adminsCount = await getAdminsCount()
  const regularUsersCount = usersCount - adminsCount
  const appointmentsCount = await getAppointmentsCount()
  const users = await loadUsersList()
  const appointmentConfigurations = await loadAppointmentConfigurations()
  const appointments = await loadAppointmentsAdmin()

  return `
    <div class="admin-shell">
      <header class="admin-header">
        <div class="container">
          <div class="d-flex justify-content-between align-items-center">
            <h1><i class="bi bi-shield-check me-2"></i>Admin Panel</h1>
            <div class="admin-actions">
              <button id="open-users-drawer-btn" class="btn btn-outline-info">
                <i class="bi bi-people me-2"></i>User Management
              </button>
              <a href="/" class="btn btn-outline-light">
                <i class="bi bi-house-door me-2"></i>Back to Site
              </a>
              <button id="admin-logout-btn" class="btn btn-outline-danger">
                <i class="bi bi-box-arrow-right me-2"></i>Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div class="admin-content">
        <div class="stat-grid">
          <div class="stat-card stat-card-clickable" id="stat-total-users" role="button" tabindex="0" aria-label="Open user management">
            <i class="bi bi-people-fill stat-icon"></i>
            <div class="stat-value">${usersCount}</div>
            <div class="stat-label">Total Users</div>
          </div>

          <div class="stat-card">
            <i class="bi bi-shield-fill-check stat-icon"></i>
            <div class="stat-value">${adminsCount}</div>
            <div class="stat-label">Administrators</div>
          </div>

          <div class="stat-card">
            <i class="bi bi-person-fill stat-icon"></i>
            <div class="stat-value">${regularUsersCount}</div>
            <div class="stat-label">Regular Users</div>
          </div>

          <div class="stat-card">
            <i class="bi bi-clock-history stat-icon"></i>
            <div class="stat-value">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
            <div class="stat-label">Today</div>
          </div>

          <div class="stat-card">
            <i class="bi bi-calendar-check stat-icon"></i>
            <div class="stat-value">${appointmentsCount}</div>
            <div class="stat-label">Appointments</div>
          </div>
        </div>

        <div class="admin-card">
          <div class="admin-card-header">
            <h2 class="admin-card-title">
              <i class="bi bi-sliders me-2"></i>Appointment Calendar Configuration
            </h2>
          </div>
          <div class="admin-card-body">
            <p class="mb-3">Configure slot rules per service. These rules are enforced when users and admins create appointments.</p>
            <div class="table-responsive">
              <table class="users-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Slot (min)</th>
                    <th>Start Hour</th>
                    <th>End Hour</th>
                    <th>Weekends</th>
                    <th>Max / Slot</th>
                    <th>Updated</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${renderAppointmentConfigurationRows(appointmentConfigurations)}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="admin-card">
          <div class="admin-card-header">
            <h2 class="admin-card-title">
              <i class="bi bi-calendar-week me-2"></i>Appointment Calendar Management
            </h2>
          </div>
          <div class="admin-card-body">
            <form id="admin-appointment-form" class="row g-2 mb-3">
              <div class="col-md-2">
                <select class="form-select" name="service" required>
                  <option value="physiotherapy">physiotherapy</option>
                  <option value="pilates">pilates</option>
                </select>
              </div>
              <div class="col-md-3">
                <input type="text" class="form-control" name="title" placeholder="Title" required />
              </div>
              <div class="col-md-3">
                <input type="datetime-local" class="form-control" name="appointment_at" required />
              </div>
              <div class="col-md-3">
                <input type="text" class="form-control" name="notes" placeholder="Notes" />
              </div>
              <div class="col-md-1 d-grid">
                <button type="submit" class="btn btn-primary">Add</button>
              </div>
            </form>
            <p id="admin-appointment-status" class="service-note mb-3"></p>

            <div class="table-responsive">
              <table class="users-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Title</th>
                    <th>Date/Time</th>
                    <th>Notes</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${appointments.length > 0 ? appointments.map(renderAppointmentRow).join('') : '<tr><td colspan="6">No appointments found.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="admin-card">
          <div class="admin-card-header">
            <h2 class="admin-card-title">
              <i class="bi bi-info-circle me-2"></i>System Information
            </h2>
          </div>
          <div class="admin-card-body">
            <p><strong>Application:</strong> Move Physio & Pilates</p>
            <p><strong>Version:</strong> 1.0.0</p>
            <p><strong>Environment:</strong> ${import.meta.env.MODE || 'development'}</p>
            <p class="mb-0"><strong>Supabase:</strong> ${hasConfig ? 'Connected' : 'Not Configured'}</p>
          </div>
        </div>
      </div>

      <div class="offcanvas offcanvas-end user-management-drawer" tabindex="-1" id="userManagementDrawer" aria-labelledby="userManagementDrawerLabel">
        <div class="offcanvas-header">
          <h5 class="offcanvas-title" id="userManagementDrawerLabel">
            <i class="bi bi-people me-2"></i>User Management
          </h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div class="offcanvas-body">
          <form id="user-upsert-form" class="row g-2 mb-3">
            <div class="col-12">
              <input type="text" class="form-control" name="user_id" placeholder="User UUID" required />
            </div>
            <div class="col-6">
              <select class="form-select" name="user_role" required>
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <div class="col-6 d-grid">
              <button type="submit" class="btn btn-primary">Add / Update User</button>
            </div>
          </form>
          <p id="user-management-status" class="service-note mb-3">
            Add or update a user role using their existing auth user UUID.
          </p>

          ${users.length > 0 ? `
            <div class="table-responsive">
              <table class="users-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Registered</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="users-table-body">
                  ${users.map(user => renderUserRow(user)).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div class="empty-state">
              <i class="bi bi-inbox empty-state-icon"></i>
              <p>No users found in the system.</p>
            </div>
          `}
        </div>
      </div>
    </div>
  `
}

async function handleLogout() {
  if (!supabase) return

  try {
    await supabase.auth.signOut()
    window.location.href = '/'
  } catch (error) {
    console.error('Error logging out:', error)
    alert('Failed to logout: ' + error.message)
  }
}

async function initAdminPanel() {
  const appElement = document.querySelector('#admin-app')
  if (!appElement) return

  // Check admin access
  const { isAdmin, error } = await checkAdminAccess()

  if (!isAdmin) {
    appElement.innerHTML = renderAccessDenied()
    return
  }

  const { data: sessionData } = await supabase.auth.getSession()
  const currentUserId = sessionData?.session?.user?.id || null

  const renderAndBind = async () => {
    appElement.innerHTML = await renderAdminPanel()

    const totalUsersCard = document.querySelector('#stat-total-users')
    const openUsersDrawerBtn = document.querySelector('#open-users-drawer-btn')
    const userManagementDrawerElement = document.querySelector('#userManagementDrawer')
    const userManagementDrawer = userManagementDrawerElement
      ? window.bootstrap?.Offcanvas.getOrCreateInstance(userManagementDrawerElement)
      : null

    const openUserManagement = () => {
      if (!userManagementDrawer) return
      userManagementDrawer.show()
    }

    totalUsersCard?.addEventListener('click', openUserManagement)
    openUsersDrawerBtn?.addEventListener('click', openUserManagement)
    totalUsersCard?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        openUserManagement()
      }
    })

    const logoutBtn = document.querySelector('#admin-logout-btn')
    if (logoutBtn) {
      logoutBtn.addEventListener('click', handleLogout)
    }

    const userManagementStatus = document.querySelector('#user-management-status')
    const userUpsertForm = document.querySelector('#user-upsert-form')
    userUpsertForm?.addEventListener('submit', async (event) => {
      event.preventDefault()
      const formData = new FormData(userUpsertForm)
      const userId = String(formData.get('user_id') || '').trim()
      const userRole = String(formData.get('user_role') || '').trim()

      if (!userId || !['user', 'admin'].includes(userRole)) {
        if (userManagementStatus) userManagementStatus.textContent = 'Please provide valid values.'
        return
      }

      const result = await upsertUserRole(userId, userRole)
      if (!result.success) {
        if (userManagementStatus) userManagementStatus.textContent = result.error
        return
      }

      if (userManagementStatus) userManagementStatus.textContent = 'User role saved successfully.'
      await renderAndBind()
    })

    const editUserButtons = document.querySelectorAll('.edit-user-btn')
    editUserButtons.forEach((button) => {
      button.addEventListener('click', async () => {
        const userId = button.dataset.userId
        const currentRole = button.dataset.currentRole
        if (!userId || !currentRole) return

        const nextRole = window.prompt('Set role (user/admin):', currentRole)
        if (!nextRole) return

        const normalizedRole = nextRole.trim().toLowerCase()
        if (!['user', 'admin'].includes(normalizedRole)) {
          if (userManagementStatus) userManagementStatus.textContent = 'Role must be user or admin.'
          return
        }

        const result = await upsertUserRole(userId, normalizedRole)
        if (!result.success) {
          if (userManagementStatus) userManagementStatus.textContent = result.error
          return
        }

        if (userManagementStatus) userManagementStatus.textContent = 'User updated successfully.'
        await renderAndBind()
      })
    })

    const removeUserButtons = document.querySelectorAll('.remove-user-btn')
    removeUserButtons.forEach((button) => {
      button.addEventListener('click', async () => {
        const userId = button.dataset.userId
        if (!userId) return

        if (!confirm('Remove this user role entry?')) {
          return
        }

        const result = await deleteUserRole(userId)
        if (!result.success) {
          if (userManagementStatus) userManagementStatus.textContent = result.error
          return
        }

        if (userManagementStatus) userManagementStatus.textContent = 'User removed successfully.'
        await renderAndBind()
      })
    })

    const saveConfigButtons = document.querySelectorAll('.save-config-btn')
    saveConfigButtons.forEach((button) => {
      button.addEventListener('click', async () => {
        const service = button.dataset.service
        const row = button.closest('tr')
        if (!service || !row) return

        const slotMinutes = Number(row.querySelector('[data-field="slot_minutes"]')?.value)
        const workStartHour = Number(row.querySelector('[data-field="work_start_hour"]')?.value)
        const workEndHour = Number(row.querySelector('[data-field="work_end_hour"]')?.value)
        const allowWeekends = row.querySelector('[data-field="allow_weekends"]')?.value === 'true'
        const maxAppointmentsPerSlot = Number(row.querySelector('[data-field="max_appointments_per_slot"]')?.value)

        if (Number.isNaN(slotMinutes) || Number.isNaN(workStartHour) || Number.isNaN(workEndHour) || Number.isNaN(maxAppointmentsPerSlot)) {
          alert('Please provide valid numeric values.')
          return
        }

        const result = await updateAppointmentConfiguration(service, {
          slot_minutes: slotMinutes,
          work_start_hour: workStartHour,
          work_end_hour: workEndHour,
          allow_weekends: allowWeekends,
          max_appointments_per_slot: maxAppointmentsPerSlot
        }, currentUserId)

        if (!result.success) {
          alert(result.error)
          return
        }

        await renderAndBind()
      })
    })

    const appointmentForm = document.querySelector('#admin-appointment-form')
    const appointmentStatus = document.querySelector('#admin-appointment-status')

    const appointmentConfigs = await loadAppointmentConfigurations()
    const slotByService = new Map(
      appointmentConfigs.map((config) => [config.service, Number(config.slot_minutes) || 60])
    )

    const serviceInput = appointmentForm?.querySelector('select[name="service"]')
    const dateInput = appointmentForm?.querySelector('input[name="appointment_at"]')

    const applySlotConstraint = () => {
      if (!serviceInput || !dateInput) return
      const slotMinutes = slotByService.get(serviceInput.value) || 60
      dateInput.step = String(slotMinutes * 60)
      if (!dateInput.value) {
        dateInput.value = alignDateTimeLocal(new Date().toISOString(), slotMinutes)
      }
    }

    serviceInput?.addEventListener('change', applySlotConstraint)
    applySlotConstraint()

    appointmentForm?.addEventListener('submit', async (event) => {
      event.preventDefault()

      const formData = new FormData(appointmentForm)
      const payload = {
        service: String(formData.get('service') || '').trim(),
        title: String(formData.get('title') || '').trim(),
        appointment_at: String(formData.get('appointment_at') || '').trim(),
        notes: String(formData.get('notes') || '').trim() || null
      }

      if (!payload.service || !payload.title || !payload.appointment_at || !currentUserId) {
        return
      }

      const slotMinutes = slotByService.get(payload.service) || 60
      if (!isAlignedToSlot(payload.appointment_at, slotMinutes)) {
        if (dateInput) {
          dateInput.value = alignDateTimeLocal(payload.appointment_at, slotMinutes)
        }
        if (appointmentStatus) {
          appointmentStatus.textContent = `Time adjusted to match ${slotMinutes}-minute slot boundaries.`
        }
        return
      }

      const result = await createAppointmentAdmin(payload, currentUserId)
      if (!result.success) {
        if (appointmentStatus) {
          appointmentStatus.textContent = result.error
        }
        return
      }

      appointmentForm.reset()
      if (appointmentStatus) {
        appointmentStatus.textContent = 'Appointment created successfully.'
      }
      await renderAndBind()
    })

    const appointmentEditButtons = document.querySelectorAll('.appointment-edit-btn')
    appointmentEditButtons.forEach((button) => {
      button.addEventListener('click', async () => {
        const appointmentId = button.dataset.appointmentId
        if (!appointmentId) return

        const row = button.closest('tr')
        if (!row) return

        const currentTitle = row.children[1]?.textContent?.trim() || ''
        const currentDate = row.children[2]?.textContent?.trim() || ''
        const title = window.prompt('Edit title:', currentTitle)
        if (!title) return

        const currentItem = await supabase
          .from('appointments')
          .select('appointment_at')
          .eq('id', appointmentId)
          .single()

        const defaultDate = toDateTimeLocal(currentItem.data?.appointment_at || currentDate)
        const appointmentAt = window.prompt('Edit date/time (YYYY-MM-DDTHH:mm):', defaultDate)
        if (!appointmentAt) return

        const service = row.children[0]?.textContent?.trim() || 'physiotherapy'
        const slotMinutes = slotByService.get(service) || 60
        if (!isAlignedToSlot(appointmentAt, slotMinutes)) {
          alert(`Time must align to ${slotMinutes}-minute slots.`)
          return
        }

        const result = await updateAppointmentAdmin(appointmentId, {
          title: title.trim(),
          appointment_at: appointmentAt
        })

        if (!result.success) {
          alert(result.error)
          return
        }

        await renderAndBind()
      })
    })

    const appointmentDeleteButtons = document.querySelectorAll('.appointment-delete-btn')
    appointmentDeleteButtons.forEach((button) => {
      button.addEventListener('click', async () => {
        const appointmentId = button.dataset.appointmentId
        if (!appointmentId) return

        if (!confirm('Delete this appointment?')) {
          return
        }

        const result = await deleteAppointmentAdmin(appointmentId)
        if (!result.success) {
          alert(result.error)
          return
        }

        await renderAndBind()
      })
    })
  }

  await renderAndBind()
}

// Initialize on page load
initAdminPanel()
