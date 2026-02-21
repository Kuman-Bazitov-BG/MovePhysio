import { checkUserIsAdmin, getSupabaseClient } from './auth.js'

let authSubscription = null

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

async function resolveCurrentUserEmail(supabase, user) {
  const directEmail = String(user?.email || '').trim().toLowerCase()
  if (isEmailLike(directEmail)) return directEmail

  const metadataContact = String(user?.user_metadata?.contact || '').trim().toLowerCase()
  if (isEmailLike(metadataContact)) return metadataContact

  if (!user?.id) return ''

  const { data, error } = await supabase
    .from('user_profiles')
    .select('contact')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return ''

  const profileContact = String(data?.contact || '').trim().toLowerCase()
  return isEmailLike(profileContact) ? profileContact : ''
}

function formatDateTime(value) {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function serviceLabel(service) {
  return service === 'physiotherapy' ? 'Physiotherapy' : 'Pilates'
}

function toDateTimeLocal(value) {
  const date = value ? new Date(value) : new Date()
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

function canViewAppointmentDetails(item, sessionUserId, isAdmin) {
  if (isAdmin) return true
  if (!sessionUserId) return false
  return item.created_by === sessionUserId
}

function canManageAppointment(item, sessionUserId, isAdmin) {
  if (isAdmin) return true
  if (!sessionUserId) return false
  return item.created_by === sessionUserId
}

function renderAppointments(items, options = {}) {
  const { isAdmin = false, sessionUserId = null } = options

  if (!items.length) {
    return '<p class="service-note mb-0">No appointments yet.</p>'
  }

  return `
    <ul class="service-list mb-0">
      ${items
        .map(
          (item) => `
            <li class="service-list-item">
              <div class="service-list-main">
                <strong>${canViewAppointmentDetails(item, sessionUserId, isAdmin) ? escapeHtml(item.title) : 'BUSY'}</strong>
                <span>${formatDateTime(item.appointment_at)}</span>
              </div>
              ${canViewAppointmentDetails(item, sessionUserId, isAdmin)
                ? `<p class="service-note mb-2">${escapeHtml(item.name || '—')} · ${escapeHtml(item.telephone || '—')}</p>`
                : ''}
              ${canViewAppointmentDetails(item, sessionUserId, isAdmin) && item.notes ? `<p class="service-note mb-2">${escapeHtml(item.notes)}</p>` : ''}
              ${canManageAppointment(item, sessionUserId, isAdmin)
                ? `
                  <div class="d-flex gap-2">
                    <button type="button" class="btn btn-sm btn-outline-light appointment-edit-btn" data-appointment-id="${item.id}">Edit</button>
                    <button type="button" class="btn btn-sm btn-outline-danger appointment-delete-btn" data-appointment-id="${item.id}">Delete</button>
                  </div>
                `
                : ''}
            </li>
          `
        )
        .join('')}
    </ul>
  `
}

function renderTasks(tasks) {
  if (!tasks.length) {
    return '<p class="service-note mb-0">No tasks yet.</p>'
  }

  return `
    <ul class="service-list mb-0">
      ${tasks
        .map(
          (task) => `
            <li class="service-list-item" data-task-id="${task.id}">
              <div class="service-list-main">
                <strong>${escapeHtml(task.title)}</strong>
                <span>${task.due_date ? escapeHtml(task.due_date) : 'No due date'} · ${task.is_done ? 'Done' : 'Open'}</span>
              </div>
              ${task.description ? `<p class="service-note mb-2">${escapeHtml(task.description)}</p>` : ''}
              <div class="d-flex gap-2">
                <button type="button" class="btn btn-sm btn-outline-light task-edit-btn" data-task-id="${task.id}">Edit</button>
                <button type="button" class="btn btn-sm btn-outline-danger task-delete-btn" data-task-id="${task.id}">Delete</button>
              </div>
            </li>
          `
        )
        .join('')}
    </ul>
  `
}

async function loadAppointments(supabase, service) {
  const { data, error } = await supabase
    .from('appointments')
    .select('id, title, name, telephone, email, notes, appointment_at, created_by')
    .eq('service', service)
    .order('appointment_at', { ascending: true })

  if (error) {
    return { data: [], error: error.message }
  }

  return { data: data ?? [], error: null }
}

async function loadTasks(supabase, service) {
  const { data, error } = await supabase
    .from('service_tasks')
    .select('id, title, description, due_date, is_done')
    .eq('service', service)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: [], error: error.message }
  }

  return { data: data ?? [], error: null }
}

async function loadAppointmentConfiguration(supabase, service) {
  const { data, error } = await supabase
    .from('appointment_configurations')
    .select('slot_minutes')
    .eq('service', service)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

async function renderServiceContent(root, service) {
  const supabase = getSupabaseClient()
  const appointmentsList = root.querySelector('[data-appointments-list]')
  const appointmentsStatus = root.querySelector('[data-appointments-status]')
  const appointmentForm = root.querySelector('[data-appointment-form]')
  const tasksPanel = root.querySelector('[data-tasks-panel]')

  if (!supabase) {
    if (appointmentsStatus) {
      appointmentsStatus.textContent = 'Supabase is not configured. Calendar is unavailable.'
      appointmentsStatus.dataset.type = 'error'
    }
    if (tasksPanel) {
      tasksPanel.innerHTML = '<p class="service-note mb-0">Supabase is not configured.</p>'
    }
    return
  }

  const { data: sessionData } = await supabase.auth.getSession()
  const session = sessionData?.session
  const sessionUserId = session?.user?.id || null
  const isAuthenticated = Boolean(session?.user)
  const isAdmin = isAuthenticated ? await checkUserIsAdmin() : false
  const configResult = await loadAppointmentConfiguration(supabase, service)
  const slotMinutes = configResult.data?.slot_minutes || 60

  const appointmentsResult = await loadAppointments(supabase, service)
  if (appointmentsList) {
    appointmentsList.innerHTML = renderAppointments(appointmentsResult.data, {
      isAdmin,
      sessionUserId
    })
  }
  if (appointmentsStatus) {
    appointmentsStatus.dataset.type = appointmentsResult.error ? 'error' : 'info'
    appointmentsStatus.textContent = appointmentsResult.error
      ? appointmentsResult.error
      : isAuthenticated
        ? isAdmin
          ? `Admin mode: full appointment visibility and management for ${serviceLabel(service)}.`
          : `User mode: you can fully manage your appointments. Other users are shown as BUSY.`
        : 'Read-only mode for guests. Sign in to create appointments.'
  }

  if (appointmentForm) {
    appointmentForm.classList.toggle('d-none', !isAuthenticated)
    const dateInput = appointmentForm.querySelector('input[name="appointment_at"]')
    if (dateInput) {
      dateInput.step = String(slotMinutes * 60)
      if (!dateInput.value) {
        dateInput.value = alignDateTimeLocal(new Date().toISOString(), slotMinutes)
      }
    }

    const guestHint = root.querySelector('[data-appointments-guest-hint]')
    if (guestHint) {
      guestHint.classList.toggle('d-none', isAuthenticated)
    }

    appointmentForm.addEventListener('submit', async (event) => {
      event.preventDefault()
      if (!session?.user) return

      const formData = new FormData(appointmentForm)
      const resolvedEmail = await resolveCurrentUserEmail(supabase, session.user)
      const payload = {
        service,
        name: String(formData.get('name') || '').trim(),
        telephone: String(formData.get('telephone') || '').trim(),
        title: String(formData.get('title') || '').trim(),
        email: resolvedEmail || null,
        notes: String(formData.get('notes') || '').trim() || null,
        appointment_at: String(formData.get('appointment_at') || '').trim(),
        created_by: session.user.id
      }

      if (!payload.name || !payload.telephone || !payload.title || !payload.appointment_at) {
        return
      }

      if (!isAlignedToSlot(payload.appointment_at, slotMinutes)) {
        const alignedValue = alignDateTimeLocal(payload.appointment_at, slotMinutes)
        if (dateInput) {
          dateInput.value = alignedValue
        }
        if (appointmentsStatus) {
          appointmentsStatus.dataset.type = 'error'
          appointmentsStatus.textContent = `Time adjusted to match ${slotMinutes}-minute slot boundaries.`
        }
        return
      }

      const { error } = await supabase.from('appointments').insert(payload)
      if (error) {
        if (appointmentsStatus) {
          appointmentsStatus.dataset.type = 'error'
          appointmentsStatus.textContent = error.message
        }
        return
      }

      appointmentForm.reset()
      await renderServiceContent(root, service)
    })
  }

  appointmentsList?.querySelectorAll('.appointment-edit-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      const appointmentId = button.dataset.appointmentId
      if (!appointmentId || !sessionUserId) return

      const currentItem = appointmentsResult.data.find((item) => item.id === appointmentId)
      if (!currentItem) return

      if (!canManageAppointment(currentItem, sessionUserId, isAdmin)) {
        if (appointmentsStatus) {
          appointmentsStatus.dataset.type = 'error'
          appointmentsStatus.textContent = 'You can edit only your own appointments.'
        }
        return
      }

      const nextName = window.prompt('Edit name:', currentItem.name || '')
      if (!nextName) return

      const nextTelephone = window.prompt('Edit phone number:', currentItem.telephone || '')
      if (!nextTelephone) return

      const nextTitle = window.prompt('Edit title:', currentItem.title || '')
      if (!nextTitle) return

      const defaultDate = toDateTimeLocal(currentItem.appointment_at)
      const nextDate = window.prompt('Edit date/time (YYYY-MM-DDTHH:mm):', defaultDate)
      if (!nextDate) return

      const nextNotes = window.prompt('Edit notes (optional):', currentItem.notes || '')

      if (!isAlignedToSlot(nextDate, slotMinutes)) {
        if (appointmentsStatus) {
          appointmentsStatus.dataset.type = 'error'
          appointmentsStatus.textContent = `Time must align to ${slotMinutes}-minute slot boundaries.`
        }
        return
      }

      const { error } = await supabase
        .from('appointments')
        .update({
          name: nextName.trim(),
          telephone: nextTelephone.trim(),
          title: nextTitle.trim(),
          appointment_at: nextDate,
          notes: (nextNotes || '').trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)

      if (error) {
        if (appointmentsStatus) {
          appointmentsStatus.dataset.type = 'error'
          appointmentsStatus.textContent = error.message
        }
        return
      }

      await renderServiceContent(root, service)
    })
  })

  appointmentsList?.querySelectorAll('.appointment-delete-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      const appointmentId = button.dataset.appointmentId
      if (!appointmentId || !sessionUserId) return

      const currentItem = appointmentsResult.data.find((item) => item.id === appointmentId)
      if (!currentItem) return

      if (!canManageAppointment(currentItem, sessionUserId, isAdmin)) {
        if (appointmentsStatus) {
          appointmentsStatus.dataset.type = 'error'
          appointmentsStatus.textContent = 'You can delete only your own appointments.'
        }
        return
      }

      if (!window.confirm('Delete this appointment?')) return

      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId)

      if (error) {
        if (appointmentsStatus) {
          appointmentsStatus.dataset.type = 'error'
          appointmentsStatus.textContent = error.message
        }
        return
      }

      await renderServiceContent(root, service)
    })
  })

  if (!tasksPanel) return

  if (!isAdmin) {
    tasksPanel.innerHTML = `
      <h2 class="service-card-title">Service Tasks</h2>
      <p class="service-note mb-0">Only admins can read and manage tasks.</p>
    `
    return
  }

  const tasksResult = await loadTasks(supabase, service)
  tasksPanel.innerHTML = `
    <h2 class="service-card-title">Service Tasks</h2>
    <form class="service-form mb-3" data-task-form>
      <div class="row g-2">
        <div class="col-md-4">
          <input type="text" class="form-control" name="title" placeholder="Task title" required />
        </div>
        <div class="col-md-4">
          <input type="text" class="form-control" name="description" placeholder="Description" />
        </div>
        <div class="col-md-3">
          <input type="date" class="form-control" name="due_date" />
        </div>
        <div class="col-md-1 d-grid">
          <button type="submit" class="btn btn-primary btn-sm">Add</button>
        </div>
      </div>
    </form>
    ${tasksResult.error ? `<p class="service-note mb-0">${escapeHtml(tasksResult.error)}</p>` : renderTasks(tasksResult.data)}
  `

  const taskForm = tasksPanel.querySelector('[data-task-form]')
  taskForm?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const formData = new FormData(taskForm)

    const payload = {
      service,
      title: String(formData.get('title') || '').trim(),
      description: String(formData.get('description') || '').trim() || null,
      due_date: String(formData.get('due_date') || '').trim() || null,
      created_by: session.user.id
    }

    if (!payload.title) return

    const { error } = await supabase.from('service_tasks').insert(payload)
    if (error) {
      alert(error.message)
      return
    }

    await renderServiceContent(root, service)
  })

  tasksPanel.querySelectorAll('.task-edit-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      const taskId = button.dataset.taskId
      if (!taskId) return

      const title = window.prompt('New task title:')
      if (!title) return

      const { error } = await supabase
        .from('service_tasks')
        .update({ title: title.trim(), updated_at: new Date().toISOString() })
        .eq('id', taskId)

      if (error) {
        alert(error.message)
        return
      }

      await renderServiceContent(root, service)
    })
  })

  tasksPanel.querySelectorAll('.task-delete-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      const taskId = button.dataset.taskId
      if (!taskId) return

      if (!window.confirm('Delete this task?')) {
        return
      }

      const { error } = await supabase
        .from('service_tasks')
        .delete()
        .eq('id', taskId)

      if (error) {
        alert(error.message)
        return
      }

      await renderServiceContent(root, service)
    })
  })
}

function getServiceFromPath(pathname) {
  if (pathname === '/physiotherapy') return 'physiotherapy'
  if (pathname === '/pilates') return 'pilates'
  return null
}

export async function initServiceFeatures(pathname = window.location.pathname) {
  const service = getServiceFromPath(pathname)
  if (!service) {
    if (authSubscription) {
      authSubscription.unsubscribe()
      authSubscription = null
    }
    return
  }

  const root = document.querySelector(`[data-service-manager="${service}"]`)
  if (!root) return

  await renderServiceContent(root, service)

  const supabase = getSupabaseClient()
  if (!supabase) return

  if (authSubscription) {
    authSubscription.unsubscribe()
    authSubscription = null
  }

  const { data } = supabase.auth.onAuthStateChange(async () => {
    const currentService = getServiceFromPath(window.location.pathname)
    if (!currentService) return
    const activeRoot = document.querySelector(`[data-service-manager="${currentService}"]`)
    if (!activeRoot) return
    await renderServiceContent(activeRoot, currentService)
  })

  authSubscription = data.subscription
}