import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from './config.js'

const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()
const hasConfig =
  Boolean(supabaseUrl && supabaseAnonKey) &&
  !/your-project-ref|your-anon-key|your-publishable-key/i.test(`${supabaseUrl} ${supabaseAnonKey}`)
const supabase = hasConfig ? createClient(supabaseUrl, supabaseAnonKey) : null

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

    // Fetch user emails from auth.users
    const usersWithEmails = await Promise.all(
      data.map(async (userRole) => {
        const { data: userData } = await supabase.auth.admin.getUserById(userRole.user_id)
        return {
          ...userRole,
          email: userData?.user?.email || 'N/A'
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

function renderUserRow(user) {
  return `
    <tr data-user-id="${user.user_id}">
      <td>${user.email}</td>
      <td>
        <span class="role-badge ${user.user_role}">${user.user_role}</span>
      </td>
      <td>${formatDate(user.created_at)}</td>
      <td>
        <button class="action-btn toggle-role-btn" data-user-id="${user.user_id}" data-current-role="${user.user_role}">
          <i class="bi bi-arrow-repeat me-1"></i>
          Toggle Role
        </button>
      </td>
    </tr>
  `
}

async function renderAdminPanel() {
  const usersCount = await getUsersCount()
  const adminsCount = await getAdminsCount()
  const regularUsersCount = usersCount - adminsCount
  const users = await loadUsersList()

  return `
    <div class="admin-shell">
      <header class="admin-header">
        <div class="container">
          <div class="d-flex justify-content-between align-items-center">
            <h1><i class="bi bi-shield-check me-2"></i>Admin Panel</h1>
            <div class="admin-actions">
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
          <div class="stat-card">
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
        </div>

        <div class="admin-card">
          <div class="admin-card-header">
            <h2 class="admin-card-title">
              <i class="bi bi-people me-2"></i>User Management
            </h2>
          </div>
          <div class="admin-card-body">
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

  // Render admin panel
  appElement.innerHTML = await renderAdminPanel()

  // Attach event listeners
  const logoutBtn = document.querySelector('#admin-logout-btn')
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout)
  }

  // Attach toggle role event listeners
  const toggleRoleBtns = document.querySelectorAll('.toggle-role-btn')
  toggleRoleBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const userId = e.currentTarget.dataset.userId
      const currentRole = e.currentTarget.dataset.currentRole

      if (confirm(`Are you sure you want to change this user's role from ${currentRole} to ${currentRole === 'admin' ? 'user' : 'admin'}?`)) {
        const success = await toggleUserRole(userId, currentRole)
        if (success) {
          // Refresh the admin panel
          appElement.innerHTML = await renderAdminPanel()
          initAdminPanel()
        }
      }
    })
  })
}

// Initialize on page load
initAdminPanel()
