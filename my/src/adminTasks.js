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

function isEmailLike(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

function isSyntheticAppointmentEmail(value) {
  return /@appointment\.local$/i.test(String(value || '').trim())
}

function normalizeAttachmentFiles(value) {
  if (!Array.isArray(value)) return []

  return value
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      name: String(entry.name || 'File').trim() || 'File',
      url: String(entry.url || '').trim()
    }))
    .filter((entry) => entry.url)
}

function renderTaskAttachmentRow(attachmentFiles) {
  const files = normalizeAttachmentFiles(attachmentFiles)
  if (!files.length) return ''

  const links = files
    .map(
      (file) =>
        `<a href="${escapeHtml(file.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(file.name)}</a>`
    )
    .join(' · ')

  return `<div class="task-contact-item"><span>Upload File</span><strong>${links}</strong></div>`
}

async function checkAdminAccess() {
  if (!supabase) return { isAdmin: false, error: 'Supabase not configured' }

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

    if (roleError) return { isAdmin: false, error: 'No role found' }
    return { isAdmin: roleData.user_role === 'admin', error: null, userId: sessionData.session.user.id }
  } catch (error) {
    return { isAdmin: false, error: error.message }
  }
}

function renderAccessDenied() {
  return `
    <div class="access-denied">
      <i class="bi bi-shield-exclamation access-denied-icon"></i>
      <h1>Access Denied</h1>
      <p>You do not have permission to access this workspace.</p>
      <a href="/admin.html" class="btn admin-pill-btn"><i class="bi bi-arrow-left me-2"></i>Admin Panel</a>
    </div>
  `
}

function formatDate(dateString) {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '—'
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
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
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
    { total: 0, pending: 0, completed: 0, overdue: 0, daily: 0, weekly: 0, monthly: 0 }
  )
}

async function loadTasks() {
  const { data, error } = await supabase
    .from('service_tasks')
    .select('id, service, title, description, due_date, is_done, created_at, updated_at, source_appointment_id')
    .order('is_done', { ascending: true })
    .order('due_date', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error loading tasks:', error)
    return []
  }

  const tasks = data || []
  const appointmentIds = Array.from(
    new Set(tasks.map((task) => task.source_appointment_id).filter(Boolean))
  )

  if (appointmentIds.length === 0) {
    return tasks.map((task) => ({ ...task, appointment: null }))
  }

  const { data: appointmentsData, error: appointmentsError } = await supabase
    .from('appointments')
    .select('id, service, title, name, telephone, email, attachment_files, appointment_at, created_by')
    .in('id', appointmentIds)

  if (appointmentsError) {
    console.error('Error loading appointment details for tasks:', appointmentsError)
    return tasks.map((task) => ({ ...task, appointment: null }))
  }

  const appointments = appointmentsData || []
  const appointmentOwnerIds = Array.from(new Set(appointments.map((item) => item.created_by).filter(Boolean)))

  const ownerContactByUserId = new Map()
  if (appointmentOwnerIds.length > 0) {
    const { data: profilesData, error: profilesError } = await supabase
      .from('user_profiles')
      .select('user_id, contact')
      .in('user_id', appointmentOwnerIds)

    if (profilesError) {
      console.error('Error loading user profile contacts for tasks:', profilesError)
    } else {
      ;(profilesData || []).forEach((profile) => {
        ownerContactByUserId.set(profile.user_id, profile.contact)
      })
    }
  }

  const appointmentsById = new Map(
    appointments.map((item) => {
      const ownerContact = ownerContactByUserId.get(item.created_by)
      const ownerEmail = isEmailLike(ownerContact) ? String(ownerContact).trim().toLowerCase() : ''
      const appointmentEmail = String(item.email || '').trim()
      const displayEmail = isSyntheticAppointmentEmail(appointmentEmail)
        ? ownerEmail || ''
        : appointmentEmail || ownerEmail || ''

      return [item.id, { ...item, display_email: displayEmail }]
    })
  )

  return tasks.map((task) => ({
    ...task,
    appointment: task.source_appointment_id ? appointmentsById.get(task.source_appointment_id) || null : null
  }))
}

async function createTask(payload, userId) {
  const { error } = await supabase.from('service_tasks').insert({ ...payload, created_by: userId })
  if (error) return { success: false, error: error.message }
  return { success: true, error: null }
}

async function updateTask(taskId, payload) {
  const { error } = await supabase
    .from('service_tasks')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', taskId)

  if (error) return { success: false, error: error.message }
  return { success: true, error: null }
}

async function deleteTask(taskId) {
  const { error } = await supabase.from('service_tasks').delete().eq('id', taskId)
  if (error) return { success: false, error: error.message }
  return { success: true, error: null }
}

function renderTaskCard(task, columnKey) {
  const status = getTaskStatus(task)
  const nextDone = task.is_done ? 'false' : 'true'
  const appointment = task.appointment || null
  const cardTitle = appointment?.title || task.title || 'Untitled appointment'
  const clientName = appointment?.name || task.client_name || 'Not provided'
  const clientEmail = appointment?.display_email || appointment?.email || task.client_email || 'Not provided'
  const clientPhone = appointment?.telephone || task.client_phone || 'Not provided'
  const displayDate = appointment?.appointment_at ? formatDate(appointment.appointment_at) : formatDateOnly(task.due_date)
  const displayService = appointment?.service || task.service || '—'

  return `
    <article class="task-card" draggable="true" data-task-id="${task.id}" data-task-column="${columnKey}" data-task-status="${status}" data-appointment-id="${task.source_appointment_id || ''}">
      <div class="task-card-top">
        <span class="task-chip status-chip status-${status}"><i class="bi bi-flag me-1"></i>${status}</span>
      </div>
      <div class="task-title-row">
        <div class="task-title">${escapeHtml(cardTitle)}</div>
      </div>
      <div class="task-contact-box">
        <div class="task-contact-item"><span>Name</span><strong>${escapeHtml(clientName)}</strong></div>
        <div class="task-contact-item"><span>Phone</span><strong>${escapeHtml(clientPhone)}</strong></div>
        <div class="task-contact-item"><span>Email</span><strong>${escapeHtml(clientEmail)}</strong></div>
        ${renderTaskAttachmentRow(appointment?.attachment_files)}
      </div>
      <div class="task-meta-box">
        <div class="task-meta-item-row"><span>Date</span><strong>${escapeHtml(displayDate)}</strong></div>
        <div class="task-meta-item-row"><span>Service</span><strong class="text-capitalize">${escapeHtml(displayService)}</strong></div>
      </div>
      <div class="task-updated">Updated ${formatDate(task.updated_at || task.created_at)}</div>
      <div class="task-card-actions">
        <button class="action-btn task-toggle-btn" data-task-id="${task.id}" data-next-done="${nextDone}">
          <i class="bi ${task.is_done ? 'bi-arrow-counterclockwise' : 'bi-check2-circle'} me-1"></i>
          ${task.is_done ? 'Reopen' : 'Done'}
        </button>
        <button class="action-btn task-edit-btn" data-task-id="${task.id}" data-appointment-id="${task.source_appointment_id || ''}">
          <i class="bi bi-pencil-square me-1"></i>Edit
        </button>
        <button class="action-btn appointment-delete-btn task-delete-btn" data-task-id="${task.id}">
          <i class="bi bi-trash me-1"></i>Delete
        </button>
      </div>
    </article>
  `
}

function groupTasksForBoard(tasks) {
  return tasks.reduce(
    (groups, task) => {
      const status = getTaskStatus(task)

      if (status === 'completed') {
        groups.done.push(task)
        return groups
      }

      if (status === 'overdue') {
        groups.expired.push(task)
        return groups
      }

      groups.pending.push(task)

      return groups
    },
    { pending: [], done: [], expired: [] }
  )
}

function renderTaskColumn(columnKey, columnTitle, iconClass, tasks, emptyLabel) {
  return `
    <section class="task-column task-dropzone list-${columnKey}" data-column-key="${columnKey}">
      <header class="task-column-header">
        <h3><i class="bi ${iconClass} me-2"></i>${columnTitle}</h3>
        <span class="task-column-count">${tasks.length}</span>
      </header>
      <div class="task-column-list">
        ${tasks.length > 0 ? tasks.map((task) => renderTaskCard(task, columnKey)).join('') : `<div class="task-column-empty">${emptyLabel}</div>`}
      </div>
    </section>
  `
}

function getTaskPayloadForColumn(columnKey) {
  const today = new Date()

  if (columnKey === 'pending') return { is_done: false, due_date: toDateInputValue(addDays(today, 1)) }
  if (columnKey === 'done') return { is_done: true }
  if (columnKey === 'expired') return { is_done: false, due_date: toDateInputValue(addDays(today, -1)) }

  return null
}

function renderWorkspace(tasks) {
  const metrics = getTaskMetrics(tasks)
  const groupedTasks = groupTasksForBoard(tasks)

  return `
    <div class="admin-shell">
      <header class="admin-header">
        <div class="container">
          <div class="workspace-header">
            <div>
              <h1 class="workspace-title"><i class="bi bi-kanban me-2"></i>Task Workspace</h1>
              <p class="workspace-subtitle">Dedicated single page for daily, weekly and monthly admin operations.</p>
            </div>
            <div class="workspace-actions">
              <a href="/admin.html" class="btn admin-pill-btn"><i class="bi bi-arrow-left me-2"></i>Admin Panel</a>
              <a href="/" class="btn admin-pill-btn"><i class="bi bi-house-door me-2"></i>Back to Site</a>
              <button id="tasks-logout-btn" class="btn admin-pill-btn"><i class="bi bi-box-arrow-right me-2"></i>Logout</button>
            </div>
          </div>
        </div>
      </header>

      <div class="tasks-workspace">
        <div class="workspace-grid">
          <section class="workspace-card">
            <h2 class="admin-card-title mb-3"><i class="bi bi-graph-up-arrow me-2"></i>Task Overview</h2>
            <div class="metric-grid">
              <div class="metric-item"><div class="label">Total</div><div class="value">${metrics.total}</div></div>
              <div class="metric-item"><div class="label">Pending</div><div class="value">${metrics.pending}</div></div>
              <div class="metric-item"><div class="label">Completed</div><div class="value">${metrics.completed}</div></div>
              <div class="metric-item"><div class="label">Overdue</div><div class="value">${metrics.overdue}</div></div>
              <div class="metric-item"><div class="label">Daily</div><div class="value">${metrics.daily}</div></div>
              <div class="metric-item"><div class="label">Weekly</div><div class="value">${metrics.weekly}</div></div>
              <div class="metric-item"><div class="label">Monthly</div><div class="value">${metrics.monthly}</div></div>
            </div>
          </section>

          <section class="workspace-card" id="task-create-card">
            <h2 class="admin-card-title mb-3"><i class="bi bi-plus-square me-2"></i>Create Task</h2>
            <form id="task-form" class="row g-2">
              <div class="col-md-3">
                <select class="form-select" name="service" required>
                  <option value="physiotherapy">physiotherapy</option>
                  <option value="pilates">pilates</option>
                </select>
              </div>
              <div class="col-md-4">
                <input type="text" class="form-control" name="title" placeholder="Task title" required />
              </div>
              <div class="col-md-2">
                <select class="form-select" name="cadence" required>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div class="col-md-3">
                <input type="date" class="form-control" name="due_date" />
              </div>
              <div class="col-md-10">
                <input type="text" class="form-control" name="description" placeholder="Description" />
              </div>
              <div class="col-md-2 d-grid">
                <button type="submit" class="btn btn-primary">Add Task</button>
              </div>
            </form>
            <p id="task-status" class="service-note mb-0 mt-3">Create and manage all admin tasks from this workspace.</p>
          </section>
        </div>

        <section class="workspace-card task-board-wrap trello-board-shell">
          <div class="task-board-heading trello-board-top">
            <div class="trello-board-left">
              <h2 class="admin-card-title mb-0"><i class="bi bi-columns-gap me-2"></i>Task Board</h2>
              <span class="board-pill">Drag & Drop</span>
            </div>
          </div>
          <div class="task-board-grid">
            ${renderTaskColumn('pending', 'Active Tasks', 'bi-list-check', groupedTasks.pending, 'No active tasks.')}
            ${renderTaskColumn('done', 'Done Tasks', 'bi-check2-all', groupedTasks.done, 'No completed tasks yet.')}
            ${renderTaskColumn('expired', 'Overdue Tasks', 'bi-exclamation-triangle', groupedTasks.expired, 'No overdue tasks.')}
          </div>
        </section>
      </div>

      <button type="button" id="quick-add-task-btn" class="quick-add-task-btn" aria-label="Quick add task">
        <i class="bi bi-plus-lg me-1"></i>New Task
      </button>
    </div>
  `
}

async function handleLogout() {
  if (!supabase) return

  try {
    await supabase.auth.signOut()
    if (window.location.pathname !== '/') {
      window.location.assign('/')
      return
    }

    window.location.reload()
  } catch (error) {
    console.error('Error logging out:', error)
  }
}

async function initTasksWorkspace() {
  const appElement = document.querySelector('#admin-tasks-app')
  if (!appElement) return

  const access = await checkAdminAccess()
  if (!access.isAdmin) {
    appElement.innerHTML = renderAccessDenied()
    return
  }

  const renderAndBind = async () => {
    const tasks = await loadTasks()
    appElement.innerHTML = renderWorkspace(tasks)

    const taskForm = document.querySelector('#task-form')
    const taskTitleInput = taskForm?.querySelector('input[name="title"]')
    const taskStatus = document.querySelector('#task-status')

    document.querySelector('#quick-add-task-btn')?.addEventListener('click', () => {
      taskForm?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      taskTitleInput?.focus()
    })

    const taskById = new Map(tasks.map((task) => [task.id, task]))

    taskForm?.addEventListener('submit', async (event) => {
      event.preventDefault()
      const formData = new FormData(taskForm)
      const cadence = String(formData.get('cadence') || 'daily')

      const cadenceToDays = { daily: 1, weekly: 7, monthly: 30 }
      const selectedDueDate = String(formData.get('due_date') || '').trim()
      const dueDate = selectedDueDate || toDateInputValue(addDays(new Date(), cadenceToDays[cadence] || 1))

      const payload = {
        service: String(formData.get('service') || '').trim(),
        title: String(formData.get('title') || '').trim(),
        description: String(formData.get('description') || '').trim() || null,
        due_date: dueDate,
        is_done: false
      }

      if (!payload.service || !payload.title) {
        if (taskStatus) taskStatus.textContent = 'Please provide required task values.'
        return
      }

      const result = await createTask(payload, access.userId)
      if (!result.success) {
        if (taskStatus) taskStatus.textContent = result.error
        return
      }

      if (taskStatus) taskStatus.textContent = 'Task created successfully.'
      await renderAndBind()
    })

    document.querySelectorAll('.task-toggle-btn').forEach((button) => {
      button.addEventListener('click', async () => {
        const taskId = button.dataset.taskId
        const nextDone = button.dataset.nextDone === 'true'
        if (!taskId) return

        const result = await updateTask(taskId, { is_done: nextDone })
        if (!result.success) {
          if (taskStatus) taskStatus.textContent = result.error
          return
        }

        if (taskStatus) taskStatus.textContent = nextDone ? 'Task marked as done.' : 'Task moved back to pending.'
        await renderAndBind()
      })
    })

    document.querySelectorAll('.task-edit-btn').forEach((button) => {
      button.addEventListener('click', async () => {
        const taskId = button.dataset.taskId
        if (!taskId) return

        const currentTask = taskById.get(taskId)
        if (!currentTask) return

        const appointmentId = currentTask.source_appointment_id || ''

        if (appointmentId && currentTask.appointment) {
          const nextTitle = window.prompt('Edit appointment title:', currentTask.appointment.title || '')
          if (nextTitle === null) return

          const nextName = window.prompt('Edit user name:', currentTask.appointment.name || '')
          if (nextName === null) return

          const nextPhone = window.prompt('Edit phone number:', currentTask.appointment.telephone || '')
          if (nextPhone === null) return

          const nextEmail = window.prompt(
            'Edit email:',
            currentTask.appointment.display_email || currentTask.appointment.email || ''
          )
          if (nextEmail === null) return

          const defaultDateTime = currentTask.appointment.appointment_at
            ? new Date(currentTask.appointment.appointment_at).toISOString().slice(0, 16)
            : ''
          const nextDateTime = window.prompt('Edit date/time (YYYY-MM-DDTHH:mm):', defaultDateTime)
          if (nextDateTime === null) return

          const { error } = await supabase
            .from('appointments')
            .update({
              title: String(nextTitle).trim(),
              name: String(nextName).trim(),
              telephone: String(nextPhone).trim(),
              email: String(nextEmail).trim(),
              appointment_at: String(nextDateTime).trim(),
              updated_at: new Date().toISOString()
            })
            .eq('id', appointmentId)

          if (error) {
            if (taskStatus) taskStatus.textContent = error.message
            return
          }

          if (taskStatus) taskStatus.textContent = 'Appointment task updated successfully.'
          await renderAndBind()
          return
        }

        const nextTitle = window.prompt('Edit task title:', currentTask.title || '')
        if (nextTitle === null) return

        const nextService = window.prompt('Edit service (physiotherapy or pilates):', currentTask.service || '')
        if (nextService === null) return

        const nextDate = window.prompt('Edit due date (YYYY-MM-DD):', currentTask.due_date || '')
        if (nextDate === null) return

        const nextDescription = window.prompt('Edit description (optional):', currentTask.description || '')
        if (nextDescription === null) return

        const result = await updateTask(taskId, {
          title: String(nextTitle).trim(),
          service: String(nextService).trim(),
          due_date: String(nextDate).trim() || null,
          description: String(nextDescription).trim() || null
        })

        if (!result.success) {
          if (taskStatus) taskStatus.textContent = result.error
          return
        }

        if (taskStatus) taskStatus.textContent = 'Task updated successfully.'
        await renderAndBind()
      })
    })

    const taskCards = () => Array.from(document.querySelectorAll('.task-card[data-task-id]'))
    const dropzones = () => Array.from(document.querySelectorAll('.task-dropzone[data-column-key]'))
    let isDroppingTask = false
    let draggingTaskId = ''
    let draggingFromColumn = ''

    taskCards().forEach((card) => {
      card.addEventListener('dragstart', (event) => {
        if (!event.dataTransfer) return

        draggingTaskId = String(card.dataset.taskId || '')
        draggingFromColumn = String(card.dataset.taskColumn || '')
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', draggingTaskId)
        event.dataTransfer.setData('text/task-id', draggingTaskId)
        event.dataTransfer.setData('text/from-column', draggingFromColumn)
        card.classList.add('is-dragging')
      })

      card.addEventListener('dragend', () => {
        draggingTaskId = ''
        draggingFromColumn = ''
        card.classList.remove('is-dragging')
        dropzones().forEach((zone) => zone.classList.remove('dropzone-active'))
      })
    })

    dropzones().forEach((zone) => {
      zone.addEventListener('dragover', (event) => {
        event.preventDefault()
        zone.classList.add('dropzone-active')
      })

      zone.addEventListener('dragleave', () => {
        zone.classList.remove('dropzone-active')
      })

      zone.addEventListener('drop', async (event) => {
        event.preventDefault()
        zone.classList.remove('dropzone-active')
        if (isDroppingTask) return

        const toColumn = String(zone.dataset.columnKey || '')
        const taskId =
          draggingTaskId ||
          String(event.dataTransfer?.getData('text/task-id') || event.dataTransfer?.getData('text/plain') || '')
        const fromColumn = draggingFromColumn || String(event.dataTransfer?.getData('text/from-column') || '')

        if (!taskId || !toColumn || toColumn === fromColumn) return

        const payload = getTaskPayloadForColumn(toColumn)
        if (!payload) return

        isDroppingTask = true
        const result = await updateTask(taskId, payload)
        isDroppingTask = false

        if (!result.success) {
          if (taskStatus) taskStatus.textContent = result.error
          return
        }

        if (taskStatus) {
          taskStatus.textContent =
            toColumn === 'done'
              ? 'Task marked as completed.'
              : toColumn === 'pending'
                ? 'Task moved to active tasks.'
                : 'Task moved to overdue tasks.'
        }
        await renderAndBind()
      })
    })

    document.querySelectorAll('.task-delete-btn').forEach((button) => {
      button.addEventListener('click', async () => {
        const taskId = button.dataset.taskId
        if (!taskId) return

        if (!confirm('Delete this task?')) return

        const result = await deleteTask(taskId)
        if (!result.success) {
          if (taskStatus) taskStatus.textContent = result.error
          return
        }

        if (taskStatus) taskStatus.textContent = 'Task deleted successfully.'
        await renderAndBind()
      })
    })

    document.querySelector('#tasks-logout-btn')?.addEventListener('click', handleLogout)
  }

  await renderAndBind()
}

initTasksWorkspace()
