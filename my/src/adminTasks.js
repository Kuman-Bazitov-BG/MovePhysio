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

function renderWorkspace(tasks) {
  const metrics = getTaskMetrics(tasks)

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

        <section class="workspace-card">
          <div class="row g-2 mb-3">
            <div class="col-md-3">
              <select id="task-cadence-filter" class="form-select">
                <option value="all">All cadences</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div class="col-md-3">
              <select id="task-status-filter" class="form-select">
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          <div class="table-responsive task-table-wrap">
            <table class="users-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Service</th>
                  <th>Due</th>
                  <th>Cadence</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="tasks-table-body">
                ${tasks.length > 0 ? `${tasks.map(renderTaskRow).join('')}<tr id="tasks-empty-filter" hidden><td colspan="7">No tasks match selected filters.</td></tr>` : '<tr><td colspan="7">No tasks found.</td></tr>'}
              </tbody>
            </table>
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
    const taskCadenceFilter = document.querySelector('#task-cadence-filter')
    const taskStatusFilter = document.querySelector('#task-status-filter')
    const taskRows = () => Array.from(document.querySelectorAll('#tasks-table-body tr[data-task-id]'))
    const taskEmptyFilterRow = document.querySelector('#tasks-empty-filter')

    const applyTaskFilters = () => {
      const selectedCadence = taskCadenceFilter?.value || 'all'
      const selectedStatus = taskStatusFilter?.value || 'all'

      let visibleRows = 0
      taskRows().forEach((row) => {
        const cadenceMatches = selectedCadence === 'all' || row.dataset.taskCadence === selectedCadence
        const statusMatches = selectedStatus === 'all' || row.dataset.taskStatus === selectedStatus
        const shouldShow = cadenceMatches && statusMatches
        row.hidden = !shouldShow
        if (shouldShow) visibleRows += 1
      })

      if (taskEmptyFilterRow) taskEmptyFilterRow.hidden = visibleRows > 0
    }

    taskCadenceFilter?.addEventListener('change', applyTaskFilters)
    taskStatusFilter?.addEventListener('change', applyTaskFilters)
    applyTaskFilters()

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
