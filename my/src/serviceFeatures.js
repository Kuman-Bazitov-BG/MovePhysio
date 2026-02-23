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

function toIsoDateKey(dateInput) {
  const date = dateInput instanceof Date ? new Date(dateInput) : new Date(dateInput)
  if (Number.isNaN(date.getTime())) return ''
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 10)
}

function toLocalTimeKey(dateInput) {
  const date = dateInput instanceof Date ? new Date(dateInput) : new Date(dateInput)
  if (Number.isNaN(date.getTime())) return ''
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${hour}:${minute}`
}

function getMonthStart(referenceDate = new Date()) {
  return new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)
}

function getCalendarMonth(referenceValue) {
  const parsedReference = referenceValue ? new Date(`${referenceValue}T00:00:00`) : new Date()
  const safeReference = Number.isNaN(parsedReference.getTime()) ? new Date() : parsedReference
  return getMonthStart(safeReference)
}

function isWeekendDate(date) {
  const day = date.getDay()
  return day === 0 || day === 6
}

function createMonthLabel(date) {
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

function createDateLabel(dateKey) {
  if (!dateKey) return ''
  const date = new Date(`${dateKey}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function getTimeSlotOptions(slotMinutes, workStartHour, workEndHour) {
  const safeSlotMinutes = Number(slotMinutes) > 0 ? Number(slotMinutes) : 60
  const startMinutes = Math.max(0, Number(workStartHour) || 0) * 60
  const endMinutes = Math.min(24, Number(workEndHour) || 24) * 60
  const slots = []

  for (let current = startMinutes; current < endMinutes; current += safeSlotMinutes) {
    const hour = Math.floor(current / 60)
    const minute = current % 60
    const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    slots.push(value)
  }

  return slots.length ? slots : ['08:00']
}

function buildCalendarDays(options) {
  const {
    items,
    monthDate,
    allowWeekends,
    selectedDate,
    isAuthenticated,
    canCreateAppointments
  } = options

  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  const appointmentDays = new Set(
    items
      .map((item) => toIsoDateKey(item.appointment_at))
      .filter(Boolean)
  )

  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
  const gridStart = new Date(monthStart)
  gridStart.setDate(monthStart.getDate() - monthStart.getDay())

  const days = []
  for (let index = 0; index < 42; index += 1) {
    const currentDate = new Date(gridStart)
    currentDate.setDate(gridStart.getDate() + index)

    const inCurrentMonth = currentDate >= monthStart && currentDate <= monthEnd
    const dayKey = toIsoDateKey(currentDate)
    const hasBusySlots = appointmentDays.has(dayKey)
    const isPast = currentDate < todayStart
    const nonWorking = isPast || (!allowWeekends && isWeekendDate(currentDate)) || !inCurrentMonth
    const isOpen = inCurrentMonth && !nonWorking && !hasBusySlots
    const disabled = !inCurrentMonth || nonWorking

    days.push({
      dayKey,
      dayNumber: currentDate.getDate(),
      inCurrentMonth,
      hasBusySlots,
      nonWorking,
      isOpen,
      isSelected: selectedDate === dayKey,
      disabled
    })
  }

  return days
}

function renderDayHoursSchedule(items, options = {}) {
  const {
    selectedDate,
    slotMinutes = 60,
    workStartHour = 8,
    workEndHour = 20
  } = options

  if (!selectedDate) {
    return `
      <h3 class="service-card-title mb-2">Day Hour Schedule</h3>
      <p class="service-note mb-0">Select a day from the calendar to see busy and not busy hours.</p>
    `
  }

  const dateLabel = createDateLabel(selectedDate)
  const timeSlots = getTimeSlotOptions(slotMinutes, workStartHour, workEndHour)
  const busyTimes = new Set(
    items
      .filter((item) => toIsoDateKey(item.appointment_at) === selectedDate)
      .map((item) => toLocalTimeKey(item.appointment_at))
      .filter(Boolean)
  )

  const busyCount = timeSlots.filter((timeValue) => busyTimes.has(timeValue)).length

  return `
    <h3 class="service-card-title mb-2">Day Hour Schedule</h3>
    <p class="service-note mb-2">${escapeHtml(dateLabel || selectedDate)} · Busy ${busyCount}/${timeSlots.length}</p>
    <ul class="hour-schedule-list mb-0">
      ${timeSlots
        .map((timeValue) => {
          const isBusy = busyTimes.has(timeValue)
          return `
            <li class="hour-schedule-item ${isBusy ? 'is-busy' : 'is-open'}">
              <span>${escapeHtml(timeValue)}</span>
              <strong>${isBusy ? 'Busy' : 'Not busy'}</strong>
            </li>
          `
        })
        .join('')}
    </ul>
  `
}

function renderDayHoursScheduleCard(items, options = {}) {
  return `
    <aside class="appointment-hour-card" data-hour-schedule-card>
      ${renderDayHoursSchedule(items, options)}
    </aside>
  `
}

function renderAppointmentsList(items, options = {}) {
  const { isAdmin = false, sessionUserId = null } = options

  if (!items.length) {
    return '<p class="service-note mb-0 mt-3">No appointments yet.</p>'
  }

  return `
    <ul class="service-list mb-0 mt-3">
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

function renderAppointmentCalendar(items, options = {}) {
  const {
    monthReference,
    selectedDate,
    selectedTime,
    allowWeekends = false,
    slotMinutes = 60,
    workStartHour = 8,
    workEndHour = 20,
    isAuthenticated = false,
    canCreateAppointments = false
  } = options

  const activeMonth = getCalendarMonth(monthReference)
  const previousMonth = new Date(activeMonth.getFullYear(), activeMonth.getMonth() - 1, 1)
  const nextMonth = new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 1)
  const monthLabel = createMonthLabel(activeMonth)
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 6 }, (_, index) => currentYear - 1 + index)
  const timeOptions = getTimeSlotOptions(slotMinutes, workStartHour, workEndHour)
  const activeTime = timeOptions.includes(selectedTime) ? selectedTime : timeOptions[0]
  const calendarDays = buildCalendarDays({
    items,
    monthDate: activeMonth,
    allowWeekends,
    selectedDate,
    isAuthenticated,
    canCreateAppointments
  })

  return `
    <div class="appointment-planner">
      <div class="appointment-calendar" data-calendar-root>
      <div class="appointment-calendar-head">
        <button
          type="button"
          class="appointment-calendar-nav"
          data-calendar-nav="prev"
          data-calendar-month="${toIsoDateKey(previousMonth)}"
          aria-label="Previous month"
        >
          ‹
        </button>
        <h3 class="appointment-calendar-title mb-0">${escapeHtml(monthLabel)}</h3>
        <button
          type="button"
          class="appointment-calendar-nav"
          data-calendar-nav="next"
          data-calendar-month="${toIsoDateKey(nextMonth)}"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div class="appointment-calendar-pickers">
        <label class="appointment-picker">
          <span>Month</span>
          <select data-calendar-month-select>
            ${Array.from({ length: 12 }, (_, monthIndex) => {
              const monthDate = new Date(activeMonth.getFullYear(), monthIndex, 1)
              const monthName = monthDate.toLocaleString('en-US', { month: 'short' })
              const selected = monthIndex === activeMonth.getMonth() ? 'selected' : ''
              return `<option value="${monthIndex}" ${selected}>${escapeHtml(monthName)}</option>`
            }).join('')}
          </select>
        </label>

        <label class="appointment-picker">
          <span>Year</span>
          <select data-calendar-year-select>
            ${yearOptions
              .map((year) => `<option value="${year}" ${year === activeMonth.getFullYear() ? 'selected' : ''}>${year}</option>`)
              .join('')}
          </select>
        </label>

        <label class="appointment-picker">
          <span>Hour</span>
          <select data-calendar-time ${!isAuthenticated || !canCreateAppointments || !selectedDate ? 'disabled' : ''}>
            ${timeOptions
              .map((timeValue) => `<option value="${timeValue}" ${timeValue === activeTime ? 'selected' : ''}>${timeValue}</option>`)
              .join('')}
          </select>
        </label>
      </div>

      <div class="appointment-calendar-weekdays" aria-hidden="true">
        <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
      </div>

      <div class="appointment-calendar-grid" role="grid" aria-label="Appointment date calendar">
        ${calendarDays
          .map((day) => {
            const classes = [
              'appointment-calendar-day',
              day.inCurrentMonth ? '' : 'is-outside-month',
              day.nonWorking ? 'is-non-working' : '',
              day.hasBusySlots ? 'is-busy' : '',
              day.isOpen ? 'is-open' : '',
              day.isSelected ? 'is-selected' : ''
            ]
              .filter(Boolean)
              .join(' ')

            return `
              <button
                type="button"
                class="${classes}"
                data-calendar-date="${day.dayKey}"
                ${day.disabled ? 'disabled' : ''}
              >
                <span>${day.dayNumber}</span>
              </button>
            `
          })
          .join('')}
      </div>

      <div class="appointment-calendar-legend">
        <span class="legend-item"><i class="legend-dot legend-open"></i>Open day</span>
        <span class="legend-item"><i class="legend-dot legend-busy"></i>Busy day</span>
        <span class="legend-item"><i class="legend-dot legend-off"></i>Not working day</span>
      </div>
      </div>

      ${renderDayHoursScheduleCard(items, {
        selectedDate,
        slotMinutes,
        workStartHour,
        workEndHour
      })}
    </div>
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
    .select('slot_minutes, work_start_hour, work_end_hour, allow_weekends')
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
  const canCreateAppointments = isAuthenticated
  const isAdmin = isAuthenticated ? await checkUserIsAdmin() : false
  const configResult = await loadAppointmentConfiguration(supabase, service)
  const slotMinutes = configResult.data?.slot_minutes || 60
  const workStartHour = configResult.data?.work_start_hour ?? 8
  const workEndHour = configResult.data?.work_end_hour ?? 20
  const allowWeekends = Boolean(configResult.data?.allow_weekends)
  const monthReference = root.dataset.calendarMonth || toIsoDateKey(getMonthStart(new Date()))
  const selectedDate = root.dataset.selectedDate || ''
  const selectedTime = root.dataset.selectedTime || `${String(workStartHour).padStart(2, '0')}:00`

  const appointmentsResult = await loadAppointments(supabase, service)
  if (appointmentsList) {
    appointmentsList.innerHTML = `
      ${renderAppointmentCalendar(appointmentsResult.data, {
        monthReference,
        selectedDate,
        selectedTime,
        allowWeekends,
        slotMinutes,
        workStartHour,
        workEndHour,
        isAuthenticated,
        canCreateAppointments
      })}
      ${renderAppointmentsList(appointmentsResult.data, {
        isAdmin,
        sessionUserId
      })}
    `
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
      dateInput.min = toDateTimeLocal(new Date().toISOString())
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

  appointmentsList?.querySelectorAll('[data-calendar-nav]').forEach((button) => {
    button.addEventListener('click', async () => {
      const nextMonth = button.dataset.calendarMonth
      if (!nextMonth) return
      root.dataset.calendarMonth = nextMonth
      await renderServiceContent(root, service)
    })
  })

  const monthSelect = appointmentsList?.querySelector('[data-calendar-month-select]')
  const yearSelect = appointmentsList?.querySelector('[data-calendar-year-select]')
  const updateCalendarMonth = async () => {
    const monthValue = Number(monthSelect?.value)
    const yearValue = Number(yearSelect?.value)
    if (!Number.isInteger(monthValue) || !Number.isInteger(yearValue)) return
    root.dataset.calendarMonth = toIsoDateKey(new Date(yearValue, monthValue, 1))
    await renderServiceContent(root, service)
  }

  monthSelect?.addEventListener('change', updateCalendarMonth)
  yearSelect?.addEventListener('change', updateCalendarMonth)

  const applyDateTimeToInput = () => {
    const dateInput = appointmentForm?.querySelector('input[name="appointment_at"]')
    if (!dateInput) return

    const dateKey = root.dataset.selectedDate || ''
    const timeValue = root.dataset.selectedTime || `${String(workStartHour).padStart(2, '0')}:00`
    if (!dateKey) return

    const localDate = new Date(`${dateKey}T${timeValue}:00`)
    if (Number.isNaN(localDate.getTime())) return

    const alignedValue = alignDateTimeLocal(localDate.toISOString(), slotMinutes)
    dateInput.value = alignedValue
  }

  appointmentsList?.querySelector('[data-calendar-time]')?.addEventListener('change', (event) => {
    const nextTime = String(event.target.value || '').trim()
    if (!nextTime) return
    root.dataset.selectedTime = nextTime
    applyDateTimeToInput()
  })

  appointmentsList?.querySelectorAll('[data-calendar-date]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.disabled) return
      const dateKey = button.dataset.calendarDate
      if (!dateKey) return

      root.dataset.selectedDate = dateKey
      if (!root.dataset.selectedTime) {
        root.dataset.selectedTime = `${String(workStartHour).padStart(2, '0')}:00`
      }

      applyDateTimeToInput()

      appointmentsList
        .querySelectorAll('.appointment-calendar-day.is-selected')
        .forEach((cell) => cell.classList.remove('is-selected'))
      button.classList.add('is-selected')

      const timeSelect = appointmentsList.querySelector('[data-calendar-time]')
      if (timeSelect) {
        timeSelect.disabled = !isAuthenticated || !canCreateAppointments
      }

      const hourScheduleCard = appointmentsList.querySelector('[data-hour-schedule-card]')
      if (hourScheduleCard) {
        hourScheduleCard.innerHTML = renderDayHoursSchedule(appointmentsResult.data, {
          selectedDate: dateKey,
          slotMinutes,
          workStartHour,
          workEndHour
        })
      }
    })
  })

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