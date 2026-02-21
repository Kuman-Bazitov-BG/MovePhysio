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
      <a href="/admin.html" class="btn-home"><i class="bi bi-arrow-left me-2"></i>Back to Admin</a>
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
    .select('id, service, title, description, due_date, is_done, created_at, updated_at')
    .order('is_done', { ascending: true })
    .order('due_date', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error loading tasks:', error)
    return []
  }

  return data || []
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
  const cadence = getTaskCadence(task)
  const status = getTaskStatus(task)
  const nextDone = task.is_done ? 'false' : 'true'

  return `
    <article class="task-card" draggable="true" data-task-id="${task.id}" data-task-column="${columnKey}" data-task-cadence="${cadence}" data-task-status="${status}">
      <header class="task-card-header">
        <div class="task-title">${escapeHtml(task.title)}</div>
        <span class="task-badge cadence-${cadence}">${cadence}</span>
      </header>
      <p class="task-description">${task.description ? escapeHtml(task.description) : 'No description'}</p>
      <div class="task-meta-grid">
        <div class="task-meta-item"><span>Service</span><strong>${escapeHtml(task.service)}</strong></div>
        <div class="task-meta-item"><span>Due</span><strong>${formatDateOnly(task.due_date)}</strong></div>
        <div class="task-meta-item"><span>Status</span><strong class="task-badge status-${status}">${status}</strong></div>
        <div class="task-meta-item"><span>Updated</span><strong>${formatDate(task.updated_at || task.created_at)}</strong></div>
      </div>
      <div class="task-card-actions">
        <button class="action-btn task-toggle-btn" data-task-id="${task.id}" data-next-done="${nextDone}">
          <i class="bi ${task.is_done ? 'bi-arrow-counterclockwise' : 'bi-check2-circle'} me-1"></i>
          ${task.is_done ? 'Reopen' : 'Done'}
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
      const cadence = getTaskCadence(task)

      if (status === 'completed') {
        groups.done.push(task)
        return groups
      }

      if (status === 'overdue') {
        groups.expired.push(task)
        return groups
      }

      groups.pending.push(task)

      if (cadence === 'daily') groups.daily.push(task)
      else if (cadence === 'weekly') groups.weekly.push(task)
      else groups.monthly.push(task)

      return groups
    },
    { pending: [], daily: [], weekly: [], monthly: [], done: [], expired: [] }
  )
}

function renderTaskColumn(columnKey, columnTitle, iconClass, tasks, emptyLabel) {
  return `
    <section class="task-column" data-column-key="${columnKey}">
      <header class="task-column-header">
        <h3><i class="bi ${iconClass} me-2"></i>${columnTitle}</h3>
        <span class="task-column-count">${tasks.length}</span>
      </header>
      <div class="task-column-list task-dropzone" data-column-key="${columnKey}">
        ${tasks.length > 0 ? tasks.map((task) => renderTaskCard(task, columnKey)).join('') : `<div class="task-column-empty">${emptyLabel}</div>`}
      </div>
    </section>
  `
}

function getTaskPayloadForColumn(columnKey) {
  const today = new Date()

  if (columnKey === 'pending') return { is_done: false, due_date: toDateInputValue(addDays(today, 1)) }
  if (columnKey === 'daily') return { is_done: false, due_date: toDateInputValue(addDays(today, 1)) }
  if (columnKey === 'weekly') return { is_done: false, due_date: toDateInputValue(addDays(today, 7)) }
  if (columnKey === 'monthly') return { is_done: false, due_date: toDateInputValue(addDays(today, 30)) }
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
              <a href="/admin.html" class="btn btn-outline-info"><i class="bi bi-arrow-left me-2"></i>Back to Admin</a>
              <a href="/" class="btn btn-outline-light"><i class="bi bi-house-door me-2"></i>Back to Site</a>
              <button id="tasks-logout-btn" class="btn btn-outline-danger"><i class="bi bi-box-arrow-right me-2"></i>Logout</button>
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

        <section class="workspace-card task-board-wrap">
          <div class="task-board-heading">
            <h2 class="admin-card-title mb-0"><i class="bi bi-columns-gap me-2"></i>Task Board</h2>
            <p class="service-note mb-0">Pending tasks are grouped by cadence, with dedicated columns for done and expired.</p>
          </div>
          <div class="task-board-grid">
            ${renderTaskColumn('pending', 'Overall Pending', 'bi-list-check', groupedTasks.pending, 'No pending tasks.')}
            ${renderTaskColumn('daily', 'Daily', 'bi-sun', groupedTasks.daily, 'No daily tasks.')}
            ${renderTaskColumn('weekly', 'Weekly', 'bi-calendar-week', groupedTasks.weekly, 'No weekly tasks.')}
            ${renderTaskColumn('monthly', 'Monthly', 'bi-calendar-month', groupedTasks.monthly, 'No monthly tasks.')}
            ${renderTaskColumn('done', 'Done Tasks', 'bi-check2-all', groupedTasks.done, 'No completed tasks yet.')}
            ${renderTaskColumn('expired', 'Expired Tasks', 'bi-exclamation-triangle', groupedTasks.expired, 'No expired tasks.')}
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
  await supabase.auth.signOut()
  window.location.href = '/'
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

    const taskCards = () => Array.from(document.querySelectorAll('.task-card[data-task-id]'))
    const dropzones = () => Array.from(document.querySelectorAll('.task-dropzone[data-column-key]'))
    let isDroppingTask = false

    taskCards().forEach((card) => {
      card.addEventListener('dragstart', (event) => {
        if (!event.dataTransfer) return

        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/task-id', String(card.dataset.taskId || ''))
        event.dataTransfer.setData('text/from-column', String(card.dataset.taskColumn || ''))
        card.classList.add('is-dragging')
      })

      card.addEventListener('dragend', () => {
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
        const taskId = String(event.dataTransfer?.getData('text/task-id') || '')
        const fromColumn = String(event.dataTransfer?.getData('text/from-column') || '')

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

        if (taskStatus) taskStatus.textContent = `Task moved to ${toColumn}.`
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
