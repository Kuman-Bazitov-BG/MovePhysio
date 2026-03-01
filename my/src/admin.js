import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from './config.js'
import { applyTranslations, initI18n } from './i18n.js'
import { initAdminChat, teardownAdminChat } from './chat.js'

const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()
const hasConfig =
  Boolean(supabaseUrl && supabaseAnonKey) &&
  !/your-project-ref|your-anon-key|your-publishable-key/i.test(`${supabaseUrl} ${supabaseAnonKey}`)
const supabase = hasConfig ? createClient(supabaseUrl, supabaseAnonKey) : null
const PHYSIOTHERAPY_FILES_BUCKET = 'physiotherapy-appointment-files'
let adminRealtimeChannel = null
let adminRealtimeTimer = null

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
      .select('id, service, title, notes, appointment_at, created_at, created_by, attachment_files')
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

async function loadAppointmentAdminById(appointmentId) {
  if (!supabase) return { data: null, error: 'Supabase not configured' }

  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('id, service, title, notes, appointment_at, created_at, created_by, attachment_files')
      .eq('id', appointmentId)
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (error) {
    return { data: null, error: error.message }
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

async function loadServiceTasksAdmin() {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('service_tasks')
      .select('id, service, title, description, due_date, is_done, created_at, updated_at')
      .order('is_done', { ascending: true })
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading service tasks:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error loading service tasks:', error)
    return []
  }
}

async function createServiceTaskAdmin(payload, userId) {
  if (!supabase) return { success: false, error: 'Supabase not configured' }

  try {
    const { error } = await supabase
      .from('service_tasks')
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

async function updateServiceTaskAdmin(taskId, payload) {
  if (!supabase) return { success: false, error: 'Supabase not configured' }

  try {
    const { error } = await supabase
      .from('service_tasks')
      .update({
        ...payload,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function deleteServiceTaskAdmin(taskId) {
  if (!supabase) return { success: false, error: 'Supabase not configured' }

  try {
    const { error } = await supabase
      .from('service_tasks')
      .delete()
      .eq('id', taskId)

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

function formatDateOnly(dateString) {
  if (!dateString) return '—'
  const date = new Date(`${dateString}T00:00:00`)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function startOfDay(dateInput = new Date()) {
  const date = new Date(dateInput)
  date.setHours(0, 0, 0, 0)
  return date
}

function toDateInputValue(dateInput = new Date()) {
  const date = new Date(dateInput)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(dateInput, days) {
  const date = new Date(dateInput)
  date.setDate(date.getDate() + days)
  return date
}

function getTaskCadence(task) {
  if (!task?.due_date) return 'monthly'

  const today = startOfDay()
  const due = startOfDay(`${task.due_date}T00:00:00`)
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / 86400000)

  if (diffDays <= 1) return 'daily'
  if (diffDays <= 7) return 'weekly'
  return 'monthly'
}

function getTaskStatus(task) {
  if (task.is_done) return 'completed'
  if (!task?.due_date) return 'pending'

  const today = startOfDay()
  const due = startOfDay(`${task.due_date}T00:00:00`)
  if (due.getTime() < today.getTime()) return 'overdue'

  return 'pending'
}

function getTaskMetrics(tasks) {
  return tasks.reduce(
    (summary, task) => {
      const status = getTaskStatus(task)
      const cadence = getTaskCadence(task)

      summary.total += 1
      if (status === 'completed') summary.completed += 1
      if (status === 'pending') summary.pending += 1
      if (status === 'overdue') summary.overdue += 1

      if (cadence === 'daily') summary.daily += 1
      if (cadence === 'weekly') summary.weekly += 1
      if (cadence === 'monthly') summary.monthly += 1

      return summary
    },
    {
      total: 0,
      pending: 0,
      completed: 0,
      overdue: 0,
      daily: 0,
      weekly: 0,
      monthly: 0
    }
  )
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

function parseAttachmentFiles(value) {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string') return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function resolveAttachmentPublicUrl(filePath, existingUrl) {
  const normalizedExistingUrl = String(existingUrl || '').trim()
  if (normalizedExistingUrl) return normalizedExistingUrl

  const normalizedPath = String(filePath || '').trim()
  if (!normalizedPath || !supabase) return ''

  const { data } = supabase.storage
    .from(PHYSIOTHERAPY_FILES_BUCKET)
    .getPublicUrl(normalizedPath)

  return String(data?.publicUrl || '').trim()
}

function normalizeAdminAttachmentFiles(value) {
  return parseAttachmentFiles(value)
    .map((entry, index) => {
      if (typeof entry === 'string') {
        const pathValue = entry.trim()
        const finalUrl = resolveAttachmentPublicUrl(pathValue, '')
        return {
          name: pathValue.split('/').pop() || `File ${index + 1}`,
          url: finalUrl,
          path: pathValue,
          size: null,
          type: null
        }
      }

      if (!entry || typeof entry !== 'object') return null

      const pathValue = String(entry.path || '').trim()
      const finalUrl = resolveAttachmentPublicUrl(pathValue, entry.url)

      return {
        name: String(entry.name || pathValue.split('/').pop() || `File ${index + 1}`).trim() || `File ${index + 1}`,
        url: finalUrl,
        path: pathValue,
        size: entry.size ?? null,
        type: entry.type ?? null
      }
    })
    .filter((entry) => entry && (entry.url || entry.path))
}

async function loadAppointmentFilesFromBucket(createdBy, appointmentId) {
  const ownerId = String(createdBy || '').trim()
  const id = String(appointmentId || '').trim()
  if (!ownerId || !id || !supabase) return []

  try {
    const folder = `${ownerId}/${id}`
    const { data, error } = await supabase.storage
      .from(PHYSIOTHERAPY_FILES_BUCKET)
      .list(folder, {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' }
      })

    if (error || !Array.isArray(data)) return []

    return data
      .filter((item) => item && typeof item.name === 'string' && item.name.length > 0)
      .map((item, index) => {
        const path = `${folder}/${item.name}`
        const url = resolveAttachmentPublicUrl(path, '')

        return {
          name: item.name || `File ${index + 1}`,
          path,
          url,
          size: item.metadata?.size ?? null,
          type: item.metadata?.mimetype ?? null
        }
      })
  } catch {
    return []
  }
}

async function loadAppointmentFilesFromStorageObjects(appointmentId) {
  const id = String(appointmentId || '').trim()
  if (!id || !supabase) return { files: [], error: null }

  try {
    const { data, error } = await supabase
      .schema('storage')
      .from('objects')
      .select('name, metadata, created_at')
      .eq('bucket_id', PHYSIOTHERAPY_FILES_BUCKET)
      .ilike('name', `%/${id}/%`)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      return { files: [], error: error.message }
    }

    const files = (data || [])
      .filter((item) => item && typeof item.name === 'string' && item.name.trim())
      .map((item, index) => {
        const path = String(item.name || '').trim()
        const url = resolveAttachmentPublicUrl(path, '')

        return {
          name: path.split('/').pop() || `File ${index + 1}`,
          path,
          url,
          size: item.metadata?.size ?? null,
          type: item.metadata?.mimetype ?? null
        }
      })

    return { files, error: null }
  } catch (error) {
    return { files: [], error: error.message }
  }
}

async function loadAllFilesFromStorageBucket() {
  if (!supabase) return { files: [], error: null }

  try {
    const { data, error } = await supabase
      .schema('storage')
      .from('objects')
      .select('name, metadata, created_at')
      .eq('bucket_id', PHYSIOTHERAPY_FILES_BUCKET)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      return { files: [], error: error.message }
    }

    const files = (data || [])
      .filter((item) => item && typeof item.name === 'string' && item.name.trim())
      .map((item, index) => {
        const path = String(item.name || '').trim()
        const url = resolveAttachmentPublicUrl(path, '')

        return {
          name: path.split('/').pop() || `File ${index + 1}`,
          path,
          url,
          size: item.metadata?.size ?? null,
          type: item.metadata?.mimetype ?? null
        }
      })

    return { files, error: null }
  } catch (error) {
    return { files: [], error: error.message }
  }
}

function mergeAppointmentFiles(primaryFiles, fallbackFiles) {
  const merged = []
  const seen = new Set()

  const addFile = (file) => {
    if (!file) return
    const key = String(file.path || file.url || file.name || '').trim().toLowerCase()
    if (!key || seen.has(key)) return
    seen.add(key)
    merged.push(file)
  }

  primaryFiles.forEach(addFile)
  fallbackFiles.forEach(addFile)

  return merged
}

function formatFileSize(sizeBytes) {
  const numericSize = Number(sizeBytes)
  if (!Number.isFinite(numericSize) || numericSize < 0) return 'Unknown size'
  if (numericSize < 1024) return `${numericSize} B`
  if (numericSize < 1024 * 1024) return `${(numericSize / 1024).toFixed(1)} KB`
  return `${(numericSize / (1024 * 1024)).toFixed(1)} MB`
}

function renderAppointmentAttachmentItems(attachmentFiles) {
  if (!Array.isArray(attachmentFiles) || !attachmentFiles.length) {
    return '<p class="appointment-files-empty mb-0">No uploaded files for this appointment.</p>'
  }

  return `
    <ul class="appointment-files-list">
      ${attachmentFiles
        .map((file, index) => {
          const name = escapeHtml(file?.name || `File ${index + 1}`)
          const url = String(file?.url || '').trim()
          const type = escapeHtml(file?.type || 'unknown')
          const size = formatFileSize(file?.size)
          const controls = url
            ? `
              <div class="appointment-file-actions">
                <button type="button" class="action-btn appointment-file-preview-btn" data-preview-file-url="${escapeHtml(url)}">Preview</button>
                <a class="action-btn" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Open</a>
                <a class="action-btn" href="${escapeHtml(url)}" download="${name}">Download</a>
              </div>
            `
            : '<span class="appointment-file-unavailable">No URL available</span>'

          return `
            <li class="appointment-file-item">
              <div class="appointment-file-meta">
                <div class="appointment-file-name">${name}</div>
                <div class="appointment-file-details">${size} • ${type}</div>
              </div>
              ${controls}
            </li>
          `
        })
        .join('')}
    </ul>
  `
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
    <tr data-appointment-id="${appointment.id}" class="appointment-row" role="button" tabindex="0" aria-label="Open appointment details">
      <td>${escapeHtml(appointment.service)}</td>
      <td>${escapeHtml(appointment.title)}</td>
      <td>${formatDate(appointment.appointment_at)}</td>
      <td>${appointment.notes ? escapeHtml(appointment.notes) : '—'}</td>
      <td>${formatDate(appointment.created_at)}</td>
      <td>
        <button class="action-btn appointment-edit-btn" data-appointment-id="${appointment.id}">
          <i class="bi bi-pencil me-1"></i>Open
        </button>
        <button class="action-btn appointment-delete-btn ms-2" data-appointment-id="${appointment.id}">
          <i class="bi bi-trash me-1"></i>Remove
        </button>
      </td>
    </tr>
  `
}

function renderTaskRow(task) {
  const cadence = getTaskCadence(task)
  const status = getTaskStatus(task)
  const nextDone = task.is_done ? 'false' : 'true'

  return `
    <tr data-task-id="${task.id}" data-task-cadence="${cadence}" data-task-status="${status}">
      <td>
        <div class="task-title">${escapeHtml(task.title)}</div>
        <div class="task-description">${task.description ? escapeHtml(task.description) : 'No description'}</div>
      </td>
      <td>${escapeHtml(task.service)}</td>
      <td>${formatDateOnly(task.due_date)}</td>
      <td><span class="task-badge cadence-${cadence}">${cadence}</span></td>
      <td><span class="task-badge status-${status}">${status}</span></td>
      <td>${formatDate(task.updated_at || task.created_at)}</td>
      <td>
        <button class="action-btn task-toggle-btn" data-task-id="${task.id}" data-next-done="${nextDone}">
          <i class="bi ${task.is_done ? 'bi-arrow-counterclockwise' : 'bi-check2-circle'} me-1"></i>
          ${task.is_done ? 'Reopen' : 'Done'}
        </button>
        <button class="action-btn appointment-delete-btn ms-2 task-delete-btn" data-task-id="${task.id}">
          <i class="bi bi-trash me-1"></i>Delete
        </button>
      </td>
    </tr>
  `
}

async function renderAdminPanel() {
  const usersCount = await getUsersCount()
  const appointmentsCount = await getAppointmentsCount()
  const users = await loadUsersList()
  const appointmentConfigurations = await loadAppointmentConfigurations()
  const appointments = await loadAppointmentsAdmin()
  const tasks = await loadServiceTasksAdmin()
  const taskMetrics = getTaskMetrics(tasks)

  return `
    <div class="admin-shell">
      <header class="admin-header">
        <div class="container">
          <div class="d-flex justify-content-between align-items-center">
            <h1><i class="bi bi-shield-check me-2"></i>Admin Panel</h1>
            <div class="admin-actions">
              <button id="admin-chat-toggle-btn" class="btn admin-pill-btn chat-pill-btn" type="button" aria-label="Open chat">
                <i class="bi bi-chat-dots-fill me-2"></i><span class="chat-pill-label">Chat</span>
                <span class="chat-unread-badge d-none" aria-live="polite"></span>
              </button>
              <a href="/" class="btn admin-pill-btn">
                <i class="bi bi-house-door me-2"></i>Back to Site
              </a>
              <button id="admin-logout-btn" class="btn admin-pill-btn">
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
            <i class="bi bi-clock-history stat-icon"></i>
            <div class="stat-value">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
            <div class="stat-label">Today</div>
          </div>

          <div class="stat-card stat-card-clickable" id="stat-appointments" role="button" tabindex="0" aria-label="Open appointment management" aria-controls="appointmentManagementDrawer">
            <i class="bi bi-calendar-check stat-icon"></i>
            <div class="stat-value">${appointmentsCount}</div>
            <div class="stat-label">Appointments</div>
          </div>

          <a href="/admin-tasks.html" class="stat-card stat-card-clickable text-decoration-none" aria-label="Open to do workspace">
            <i class="bi bi-list-check stat-icon"></i>
            <div class="stat-value">${taskMetrics.pending}</div>
            <div class="stat-label">To Do</div>
          </a>
        </div>

        <div class="admin-card">
          <div class="admin-card-header admin-card-header-drawer">
            <h2 class="admin-card-title">
              <i class="bi bi-info-circle me-2"></i>System Information
            </h2>
            <button
              type="button"
              class="action-btn drawer-toggle-btn"
              data-bs-toggle="collapse"
              data-bs-target="#system-information-drawer"
              aria-expanded="false"
              aria-controls="system-information-drawer"
            >
              <i class="bi bi-chevron-down me-1"></i>Drawer
            </button>
          </div>
          <div id="system-information-drawer" class="collapse inline-drawer-panel">
            <div class="admin-card-body">
              <p><strong>Application:</strong> Move Physio & Pilates</p>
              <p><strong>Version:</strong> 1.0.0</p>
              <p><strong>Environment:</strong> ${import.meta.env.MODE || 'development'}</p>
              <p class="mb-0"><strong>Supabase:</strong> ${hasConfig ? 'Connected' : 'Not Configured'}</p>
            </div>
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

      <div class="offcanvas offcanvas-end user-management-drawer appointment-management-drawer" tabindex="-1" id="appointmentManagementDrawer" aria-labelledby="appointmentManagementDrawerLabel">
        <div class="offcanvas-header">
          <h5 class="offcanvas-title" id="appointmentManagementDrawerLabel">
            <i class="bi bi-calendar-check me-2"></i>Appointment Tools
          </h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div class="offcanvas-body">
          <div class="appointment-admin-grid">
            <div class="admin-card">
              <div class="admin-card-header admin-card-header-drawer">
                <h2 class="admin-card-title">
                  <i class="bi bi-sliders me-2"></i>Appointment Calendar Configuration
                </h2>
                <button
                  type="button"
                  class="action-btn drawer-toggle-btn"
                  data-bs-toggle="collapse"
                  data-bs-target="#appointment-config-drawer"
                  aria-expanded="false"
                  aria-controls="appointment-config-drawer"
                >
                  <i class="bi bi-chevron-down me-1"></i>Drawer
                </button>
              </div>
              <div id="appointment-config-drawer" class="collapse inline-drawer-panel">
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
            </div>

            <div class="admin-card">
              <div class="admin-card-header admin-card-header-drawer">
                <h2 class="admin-card-title">
                  <i class="bi bi-calendar-week me-2"></i>Appointment Calendar Management
                </h2>
                <button
                  type="button"
                  class="action-btn drawer-toggle-btn"
                  data-bs-toggle="collapse"
                  data-bs-target="#appointment-management-drawer"
                  aria-expanded="false"
                  aria-controls="appointment-management-drawer"
                >
                  <i class="bi bi-chevron-down me-1"></i>Drawer
                </button>
              </div>
              <div id="appointment-management-drawer" class="collapse inline-drawer-panel">
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
            </div>
          </div>
        </div>
      </div>

      <div class="modal fade" id="appointmentDetailsModal" tabindex="-1" aria-labelledby="appointmentDetailsModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-scrollable">
          <div class="modal-content admin-modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="appointmentDetailsModalLabel">
                <i class="bi bi-calendar-event me-2"></i>Appointment Details
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <form id="appointment-details-form" class="row g-3">
                <input type="hidden" name="appointment_id" />
                <div class="col-md-4">
                  <label class="form-label">Service</label>
                  <select class="form-select" name="service" required>
                    <option value="physiotherapy">physiotherapy</option>
                    <option value="pilates">pilates</option>
                  </select>
                </div>
                <div class="col-md-8">
                  <label class="form-label">Title</label>
                  <input type="text" class="form-control" name="title" required />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Date/Time</label>
                  <input type="datetime-local" class="form-control" name="appointment_at" required />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Created</label>
                  <input type="text" class="form-control" name="created_at_readonly" readonly />
                </div>
                <div class="col-12">
                  <label class="form-label">Notes</label>
                  <textarea class="form-control" name="notes" rows="3" placeholder="Notes"></textarea>
                </div>
                <div class="col-12">
                  <label class="form-label">Physiotherapy Files</label>
                  <div id="appointment-files-panel" class="appointment-files-panel">
                    <p class="appointment-files-empty mb-0">No uploaded files for this appointment.</p>
                  </div>
                </div>
                <div class="col-12 d-none" id="appointment-file-preview-wrapper">
                  <label class="form-label">File Preview</label>
                  <iframe
                    id="appointment-file-preview-frame"
                    class="appointment-file-preview-frame"
                    title="Appointment file preview"
                  ></iframe>
                </div>
              </form>
              <p id="appointment-details-status" class="service-note mt-3 mb-0"></p>
            </div>
            <div class="modal-footer d-flex justify-content-between">
              <button type="button" class="btn btn-outline-danger" id="appointment-details-delete-btn">
                <i class="bi bi-trash me-1"></i>Delete
              </button>
              <div class="d-flex gap-2">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="button" class="btn btn-primary" id="appointment-details-save-btn">
                  <i class="bi bi-check2-circle me-1"></i>Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  `
}

async function handleLogout() {
  if (!supabase) return

  try {
    teardownAdminChat()

    if (adminRealtimeChannel) {
      adminRealtimeChannel.unsubscribe()
      adminRealtimeChannel = null
    }

    if (adminRealtimeTimer) {
      window.clearTimeout(adminRealtimeTimer)
      adminRealtimeTimer = null
    }

    await supabase.auth.signOut()
    if (window.location.pathname !== '/') {
      window.location.assign('/')
      return
    }

    window.location.reload()
  } catch (error) {
    console.error('Error logging out:', error)
    alert('Failed to logout: ' + error.message)
  }
}

async function initAdminPanel() {
  const appElement = document.querySelector('#admin-app')
  if (!appElement) return

  initI18n()

  if (adminRealtimeChannel) {
    adminRealtimeChannel.unsubscribe()
    adminRealtimeChannel = null
  }

  teardownAdminChat()

  if (adminRealtimeTimer) {
    window.clearTimeout(adminRealtimeTimer)
    adminRealtimeTimer = null
  }

  // Check admin access
  const { isAdmin, error } = await checkAdminAccess()

  if (!isAdmin) {
    appElement.innerHTML = renderAccessDenied()
    applyTranslations(appElement)
    if (error) {
      console.warn('Admin access denied:', error)
    }
    return
  }

  const { data: sessionData } = await supabase.auth.getSession()
  const currentUserId = sessionData?.session?.user?.id || null

  let isRenderingAdminPanel = false
  const renderAndBind = async () => {
    if (isRenderingAdminPanel) return
    isRenderingAdminPanel = true
    try {
      appElement.innerHTML = await renderAdminPanel()
      applyTranslations(appElement)
      await initAdminChat()

    const totalUsersCard = document.querySelector('#stat-total-users')
    const appointmentsCard = document.querySelector('#stat-appointments')
    const userManagementDrawerElement = document.querySelector('#userManagementDrawer')
    const appointmentManagementDrawerElement = document.querySelector('#appointmentManagementDrawer')
    const userManagementDrawer = userManagementDrawerElement
      ? window.bootstrap?.Offcanvas.getOrCreateInstance(userManagementDrawerElement)
      : null
    const appointmentManagementDrawer = appointmentManagementDrawerElement
      ? window.bootstrap?.Offcanvas.getOrCreateInstance(appointmentManagementDrawerElement)
      : null

    const openUserManagement = () => {
      if (!userManagementDrawer) return
      userManagementDrawer.show()
    }

    const openAppointmentManagement = () => {
      if (!appointmentManagementDrawer) return
      appointmentManagementDrawer.show()
    }

    totalUsersCard?.addEventListener('click', openUserManagement)
    totalUsersCard?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        openUserManagement()
      }
    })
    appointmentsCard?.addEventListener('click', openAppointmentManagement)
    appointmentsCard?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        openAppointmentManagement()
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
    const appointmentDetailsModalElement = document.querySelector('#appointmentDetailsModal')
    const appointmentDetailsModal = appointmentDetailsModalElement
      ? window.bootstrap?.Modal.getOrCreateInstance(appointmentDetailsModalElement)
      : null
    const appointmentDetailsForm = document.querySelector('#appointment-details-form')
    const appointmentDetailsStatus = document.querySelector('#appointment-details-status')
    const appointmentDetailsSaveBtn = document.querySelector('#appointment-details-save-btn')
    const appointmentDetailsDeleteBtn = document.querySelector('#appointment-details-delete-btn')
    const appointmentFilesPanel = document.querySelector('#appointment-files-panel')
    const appointmentFilePreviewWrapper = document.querySelector('#appointment-file-preview-wrapper')
    const appointmentFilePreviewFrame = document.querySelector('#appointment-file-preview-frame')

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

    const getDetailsFormField = (selector) => appointmentDetailsForm?.querySelector(selector)

    const applyDetailsSlotConstraint = () => {
      const detailsServiceInput = getDetailsFormField('select[name="service"]')
      const detailsDateInput = getDetailsFormField('input[name="appointment_at"]')
      if (!detailsServiceInput || !detailsDateInput) return

      const slotMinutes = slotByService.get(detailsServiceInput.value) || 60
      detailsDateInput.step = String(slotMinutes * 60)
    }

    const openAppointmentDetailsModal = async (appointmentId) => {
      if (!appointmentId || !appointmentDetailsForm || !appointmentDetailsModal) return

      if (appointmentDetailsStatus) {
        appointmentDetailsStatus.textContent = ''
      }

      const appointmentResult = await loadAppointmentAdminById(appointmentId)
      if (!appointmentResult.data) {
        if (appointmentStatus) {
          appointmentStatus.textContent = appointmentResult.error || 'Unable to load appointment details.'
        }
        return
      }

      const detailsServiceInput = getDetailsFormField('select[name="service"]')
      const detailsTitleInput = getDetailsFormField('input[name="title"]')
      const detailsDateInput = getDetailsFormField('input[name="appointment_at"]')
      const detailsNotesInput = getDetailsFormField('textarea[name="notes"]')
      const detailsCreatedInput = getDetailsFormField('input[name="created_at_readonly"]')
      const detailsIdInput = getDetailsFormField('input[name="appointment_id"]')

      if (!detailsServiceInput || !detailsTitleInput || !detailsDateInput || !detailsNotesInput || !detailsCreatedInput || !detailsIdInput) {
        return
      }

      detailsIdInput.value = String(appointmentResult.data.id)
      detailsServiceInput.value = appointmentResult.data.service || 'physiotherapy'
      detailsTitleInput.value = appointmentResult.data.title || ''
      detailsDateInput.value = toDateTimeLocal(appointmentResult.data.appointment_at)
      detailsNotesInput.value = appointmentResult.data.notes || ''
      detailsCreatedInput.value = formatDate(appointmentResult.data.created_at)

      if (appointmentFilesPanel) {
        const normalizedFiles = normalizeAdminAttachmentFiles(appointmentResult.data.attachment_files)
        const filesFromBucket = await loadAppointmentFilesFromBucket(
          appointmentResult.data.created_by,
          appointmentResult.data.id
        )
        const appointmentObjectResult = await loadAppointmentFilesFromStorageObjects(appointmentResult.data.id)
        let mergedFiles = mergeAppointmentFiles(normalizedFiles, filesFromBucket)
        mergedFiles = mergeAppointmentFiles(mergedFiles, appointmentObjectResult.files)

        if (!mergedFiles.length) {
          const allFilesResult = await loadAllFilesFromStorageBucket()
          mergedFiles = mergeAppointmentFiles(mergedFiles, allFilesResult.files)
        }

        appointmentFilesPanel.innerHTML = renderAppointmentAttachmentItems(mergedFiles)

        if (!mergedFiles.length && appointmentDetailsStatus && appointmentObjectResult.error) {
          appointmentDetailsStatus.textContent = 'Unable to read bucket files. Please apply storage read policy for admin users.'
        }
      }
      if (appointmentFilePreviewFrame) {
        appointmentFilePreviewFrame.src = 'about:blank'
      }
      appointmentFilePreviewWrapper?.classList.add('d-none')

      applyDetailsSlotConstraint()
      appointmentDetailsModal.show()
    }

    getDetailsFormField('select[name="service"]')?.addEventListener('change', applyDetailsSlotConstraint)

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

    const appointmentRows = document.querySelectorAll('tr.appointment-row')
    appointmentRows.forEach((row) => {
      const appointmentId = row.dataset.appointmentId
      if (!appointmentId) return

      row.addEventListener('click', async (event) => {
        const clickedButton = event.target.closest('button')
        if (clickedButton?.dataset.appointmentId) return
        await openAppointmentDetailsModal(appointmentId)
      })

      row.addEventListener('keydown', async (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        await openAppointmentDetailsModal(appointmentId)
      })
    })

    const appointmentEditButtons = document.querySelectorAll('.appointment-edit-btn')
    appointmentEditButtons.forEach((button) => {
      button.addEventListener('click', async () => {
        const appointmentId = button.dataset.appointmentId
        await openAppointmentDetailsModal(appointmentId)
      })
    })

    const appointmentDeleteButtons = document.querySelectorAll('.appointment-delete-btn')
    appointmentDeleteButtons.forEach((button) => {
      button.addEventListener('click', async () => {
        const appointmentId = button.dataset.appointmentId
        if (!appointmentId) return

        await openAppointmentDetailsModal(appointmentId)
      })
    })

    appointmentDetailsSaveBtn?.addEventListener('click', async () => {
      if (!appointmentDetailsForm) return

      const detailsFormData = new FormData(appointmentDetailsForm)
      const appointmentId = String(detailsFormData.get('appointment_id') || '').trim()
      const service = String(detailsFormData.get('service') || '').trim()
      const title = String(detailsFormData.get('title') || '').trim()
      const appointmentAt = String(detailsFormData.get('appointment_at') || '').trim()
      const notes = String(detailsFormData.get('notes') || '').trim()

      if (!appointmentId || !service || !title || !appointmentAt) {
        if (appointmentDetailsStatus) {
          appointmentDetailsStatus.textContent = 'Please complete all required fields.'
        }
        return
      }

      const slotMinutes = slotByService.get(service) || 60
      if (!isAlignedToSlot(appointmentAt, slotMinutes)) {
        const detailsDateInput = getDetailsFormField('input[name="appointment_at"]')
        if (detailsDateInput) {
          detailsDateInput.value = alignDateTimeLocal(appointmentAt, slotMinutes)
        }
        if (appointmentDetailsStatus) {
          appointmentDetailsStatus.textContent = `Time adjusted to match ${slotMinutes}-minute slot boundaries.`
        }
        return
      }

      const result = await updateAppointmentAdmin(appointmentId, {
        service,
        title,
        appointment_at: appointmentAt,
        notes: notes || null
      })

      if (!result.success) {
        if (appointmentDetailsStatus) {
          appointmentDetailsStatus.textContent = result.error
        }
        return
      }

      if (appointmentStatus) {
        appointmentStatus.textContent = 'Appointment updated successfully.'
      }
      appointmentDetailsModal.hide()
      await renderAndBind()
    })

    appointmentDetailsDeleteBtn?.addEventListener('click', async () => {
      if (!appointmentDetailsForm) return

      const appointmentId = String(new FormData(appointmentDetailsForm).get('appointment_id') || '').trim()
      if (!appointmentId) return

      const result = await deleteAppointmentAdmin(appointmentId)
      if (!result.success) {
        if (appointmentDetailsStatus) {
          appointmentDetailsStatus.textContent = result.error
        }
        return
      }

      if (appointmentStatus) {
        appointmentStatus.textContent = 'Appointment deleted successfully.'
      }
      appointmentDetailsModal.hide()
      await renderAndBind()
    })

      appointmentFilesPanel?.addEventListener('click', (event) => {
        const previewButton = event.target.closest('.appointment-file-preview-btn')
        if (!previewButton) return

        const previewUrl = String(previewButton.dataset.previewFileUrl || '').trim()
        if (!previewUrl || !appointmentFilePreviewWrapper || !appointmentFilePreviewFrame) return

        appointmentFilePreviewFrame.src = previewUrl
        appointmentFilePreviewWrapper.classList.remove('d-none')
      })
    } finally {
      isRenderingAdminPanel = false
    }

  }

  await renderAndBind()

  const scheduleAdminRefresh = () => {
    if (adminRealtimeTimer) {
      window.clearTimeout(adminRealtimeTimer)
    }

    adminRealtimeTimer = window.setTimeout(async () => {
      if (!document.body.contains(appElement)) return
      await renderAndBind()
    }, 150)
  }

  adminRealtimeChannel = supabase
    .channel('admin-dashboard-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, scheduleAdminRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'service_tasks' }, scheduleAdminRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'appointment_configurations' }, scheduleAdminRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, scheduleAdminRefresh)
    .subscribe()

  window.addEventListener('beforeunload', () => {
    teardownAdminChat()

    if (adminRealtimeChannel) {
      adminRealtimeChannel.unsubscribe()
      adminRealtimeChannel = null
    }

    if (adminRealtimeTimer) {
      window.clearTimeout(adminRealtimeTimer)
      adminRealtimeTimer = null
    }
  }, { once: true })
}

// Initialize on page load
initAdminPanel()
