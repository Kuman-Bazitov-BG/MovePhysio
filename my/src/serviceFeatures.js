import { checkUserIsAdmin, getSupabaseClient } from './auth.js'

let authSubscription = null

const PILATES_WEEKLY_SCHEDULE = Object.freeze({
  1: Object.freeze([
    Object.freeze({ start: '09:30', end: '10:20' }),
    Object.freeze({ start: '10:30', end: '11:20' }),
    Object.freeze({ start: '15:40', end: '16:30' }),
    Object.freeze({ start: '16:40', end: '17:30' }),
    Object.freeze({ start: '17:40', end: '18:30' })
  ]),
  2: Object.freeze([
    Object.freeze({ start: '07:15', end: '08:05' }),
    Object.freeze({ start: '08:15', end: '09:05' }),
    Object.freeze({ start: '09:15', end: '10:05' }),
    Object.freeze({ start: '12:00', end: '12:50' }),
    Object.freeze({ start: '13:00', end: '13:50' })
  ]),
  4: Object.freeze([
    Object.freeze({ start: '09:30', end: '10:20' }),
    Object.freeze({ start: '10:30', end: '11:20' }),
    Object.freeze({ start: '15:40', end: '16:30' }),
    Object.freeze({ start: '16:40', end: '17:30' }),
    Object.freeze({ start: '17:40', end: '18:30' }),
    Object.freeze({ start: '18:40', end: '19:30' })
  ]),
  5: Object.freeze([
    Object.freeze({ start: '07:15', end: '08:05' }),
    Object.freeze({ start: '08:15', end: '09:05' }),
    Object.freeze({ start: '09:15', end: '10:05' }),
    Object.freeze({ start: '10:15', end: '11:05' }),
    Object.freeze({ start: '12:00', end: '12:50' }),
    Object.freeze({ start: '13:00', end: '13:50' })
  ])
})

const PHYSIOTHERAPY_FILES_BUCKET = 'physiotherapy-appointment-files'
const MAX_PHYSIOTHERAPY_FILES = 5
const MAX_PHYSIOTHERAPY_FILE_SIZE_BYTES = 10 * 1024 * 1024

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function sanitizeStorageFileName(fileName) {
  return String(fileName || 'file')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 120) || 'file'
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

function renderAttachmentFiles(item) {
  const files = normalizeAttachmentFiles(item?.attachment_files)
  if (!files.length) return ''

  return `
    <div class="service-note mb-2">
      ${files
        .map((file) => `<a href="${escapeHtml(file.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(file.name)}</a>`)
        .join(' · ')}
    </div>
  `
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

function getPilatesSlotsForDate(dateInput) {
  const date = dateInput instanceof Date ? new Date(dateInput) : new Date(dateInput)
  if (Number.isNaN(date.getTime())) return []

  const dayOfWeek = date.getDay()
  const daySlots = PILATES_WEEKLY_SCHEDULE[dayOfWeek] || []

  return daySlots.map((slot) => ({
    start: slot.start,
    end: slot.end,
    label: `${slot.start} - ${slot.end}`
  }))
}

function getServiceSlotDefinitions(options) {
  const {
    service,
    selectedDate,
    slotMinutes,
    workStartHour,
    workEndHour
  } = options

  if (service === 'pilates' && selectedDate) {
    return getPilatesSlotsForDate(`${selectedDate}T00:00:00`)
  }

  return getTimeSlotOptions(slotMinutes, workStartHour, workEndHour).map((timeValue) => ({
    start: timeValue,
    end: timeValue,
    label: timeValue
  }))
}

function isPilatesDateTimeAllowed(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false

  const startTime = toLocalTimeKey(date)
  return getPilatesSlotsForDate(date).some((slot) => slot.start === startTime)
}

function getPilatesSlotForDateTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const startTime = toLocalTimeKey(date)
  return getPilatesSlotsForDate(date).find((slot) => slot.start === startTime) || null
}

function formatAppointmentPeriod(item) {
  const appointmentDate = new Date(item?.appointment_at)
  if (Number.isNaN(appointmentDate.getTime())) return '—'

  if (item?.service === 'pilates') {
    const slot = getPilatesSlotForDateTime(appointmentDate)
    const dateLabel = appointmentDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })

    if (slot) {
      return `${dateLabel} · ${slot.start} - ${slot.end}`
    }
  }

  return formatDateTime(item?.appointment_at)
}

function resolveSelectedCalendarDate(options) {
  const {
    service,
    items,
    monthReference,
    selectedDate,
    allowWeekends,
    isAuthenticated,
    canCreateAppointments
  } = options

  const monthDate = getCalendarMonth(monthReference)
  const calendarDays = buildCalendarDays({
    service,
    items,
    monthDate,
    allowWeekends,
    selectedDate,
    isAuthenticated,
    canCreateAppointments
  })

  const selectableDays = calendarDays.filter((day) => !day.disabled)
  if (!selectableDays.length) return ''

  const hasValidSelection = selectableDays.some((day) => day.dayKey === selectedDate)
  if (hasValidSelection) return selectedDate

  const firstOpenDay = selectableDays.find((day) => day.isOpen)
  return firstOpenDay?.dayKey || selectableDays[0].dayKey
}

function buildCalendarDays(options) {
  const {
    service,
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
    const hasPilatesSchedule = service === 'pilates' ? getPilatesSlotsForDate(currentDate).length > 0 : true
    const nonWorking = isPast || (!allowWeekends && isWeekendDate(currentDate)) || !inCurrentMonth || !hasPilatesSchedule
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
    service,
    selectedDate,
    slotMinutes = 60,
    workStartHour = 8,
    workEndHour = 20,
    maxAppointmentsPerSlot = 1
  } = options

  if (!selectedDate) {
    return `
      <h3 class="service-card-title mb-2">Day Hour Schedule</h3>
      <p class="service-note mb-0">Select a day from the calendar to see busy and available hours.</p>
    `
  }

  const dateLabel = createDateLabel(selectedDate)
  const slotDefinitions = getServiceSlotDefinitions({
    service,
    selectedDate,
    slotMinutes,
    workStartHour,
    workEndHour
  })

  if (!slotDefinitions.length) {
    return `
      <h3 class="service-card-title mb-2">Day Hour Schedule</h3>
      <p class="service-note mb-0">Holiday / no Pilates classes for this day.</p>
    `
  }

  const timeSlots = slotDefinitions.map((slot) => slot.start)
  const safeMaxAppointmentsPerSlot = Number(maxAppointmentsPerSlot) > 0 ? Number(maxAppointmentsPerSlot) : 1
  const slotUsage = new Map()

  items
    .filter((item) => toIsoDateKey(item.appointment_at) === selectedDate)
    .map((item) => toLocalTimeKey(item.appointment_at))
    .filter(Boolean)
    .forEach((timeValue) => {
      slotUsage.set(timeValue, (slotUsage.get(timeValue) || 0) + 1)
    })

  const busyCount = timeSlots.filter((timeValue) => (slotUsage.get(timeValue) || 0) >= safeMaxAppointmentsPerSlot).length

  return `
    <h3 class="service-card-title mb-2">Day Hour Schedule</h3>
    <p class="service-note mb-2">${escapeHtml(dateLabel || selectedDate)} · Busy ${busyCount}/${timeSlots.length}</p>
    <ul class="hour-schedule-list mb-0">
      ${timeSlots
        .map((timeValue) => {
          const slotDefinition = slotDefinitions.find((slot) => slot.start === timeValue)
          const usedSlots = slotUsage.get(timeValue) || 0
          const isBusy = usedSlots >= safeMaxAppointmentsPerSlot
          return `
            <li
              class="hour-schedule-item ${isBusy ? 'is-busy' : 'is-open is-clickable'}"
              ${isBusy ? '' : `data-hour-time="${escapeHtml(timeValue)}" role="button" tabindex="0"`}
            >
              <span>${escapeHtml(slotDefinition?.label || timeValue)}</span>
              <strong>${isBusy ? 'Busy' : 'Available'} · ${usedSlots}/${safeMaxAppointmentsPerSlot}</strong>
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
                <span>${escapeHtml(formatAppointmentPeriod(item))}</span>
              </div>
              ${canViewAppointmentDetails(item, sessionUserId, isAdmin)
                ? `<p class="service-note mb-2">${escapeHtml(item.name || '—')} · ${escapeHtml(item.telephone || '—')}</p>`
                : ''}
              ${canViewAppointmentDetails(item, sessionUserId, isAdmin) && item.notes ? `<p class="service-note mb-2">${escapeHtml(item.notes)}</p>` : ''}
              ${canViewAppointmentDetails(item, sessionUserId, isAdmin) ? renderAttachmentFiles(item) : ''}
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

function getNextSlotDateTimeLocal(slotMinutes) {
  const safeSlotMinutes = Number(slotMinutes) > 0 ? Number(slotMinutes) : 60
  const now = new Date()
  if (Number.isNaN(now.getTime())) {
    return toDateTimeLocal(new Date().toISOString())
  }

  now.setSeconds(0, 0)
  const totalMinutes = now.getHours() * 60 + now.getMinutes()
  const roundedMinutes = Math.ceil(totalMinutes / safeSlotMinutes) * safeSlotMinutes
  const dayMinutes = 24 * 60
  const nextDayOffset = Math.floor(roundedMinutes / dayMinutes)
  const nextMinutes = roundedMinutes % dayMinutes

  const nextDate = new Date(now)
  if (nextDayOffset > 0) {
    nextDate.setDate(nextDate.getDate() + nextDayOffset)
  }
  nextDate.setHours(Math.floor(nextMinutes / 60), nextMinutes % 60, 0, 0)

  return toDateTimeLocal(nextDate.toISOString())
}

function getNextPilatesSlotDateTimeLocal(referenceInput = new Date()) {
  const referenceDate = referenceInput instanceof Date ? new Date(referenceInput) : new Date(referenceInput)
  if (Number.isNaN(referenceDate.getTime())) {
    return ''
  }

  const normalizedReference = new Date(referenceDate)
  normalizedReference.setSeconds(0, 0)

  for (let dayOffset = 0; dayOffset < 14; dayOffset += 1) {
    const candidateDay = new Date(normalizedReference)
    candidateDay.setDate(normalizedReference.getDate() + dayOffset)

    const daySlots = getPilatesSlotsForDate(candidateDay)
    for (const slot of daySlots) {
      const [hours, minutes] = slot.start.split(':').map(Number)
      const slotDate = new Date(candidateDay)
      slotDate.setHours(hours, minutes, 0, 0)

      if (slotDate >= normalizedReference) {
        return toDateTimeLocal(slotDate.toISOString())
      }
    }
  }

  return ''
}

function isAlignedToSlot(value, slotMinutes) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime()) || !slotMinutes) return true
  return date.getMinutes() % slotMinutes === 0
}

function toUtcIsoString(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString()
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
    service,
    monthReference,
    selectedDate,
    selectedTime,
    allowWeekends = false,
    slotMinutes = 60,
    workStartHour = 8,
    workEndHour = 20,
    maxAppointmentsPerSlot = 1,
    isAuthenticated = false,
    canCreateAppointments = false
  } = options

  const activeMonth = getCalendarMonth(monthReference)
  const previousMonth = new Date(activeMonth.getFullYear(), activeMonth.getMonth() - 1, 1)
  const nextMonth = new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 1)
  const monthLabel = createMonthLabel(activeMonth)
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 6 }, (_, index) => currentYear - 1 + index)
  const timeOptions = getServiceSlotDefinitions({
    service,
    selectedDate,
    slotMinutes,
    workStartHour,
    workEndHour
  })
  const timeValues = timeOptions.map((slot) => slot.start)
  const activeTime = timeValues.includes(selectedTime) ? selectedTime : (timeValues[0] || '')
  const calendarDays = buildCalendarDays({
    service,
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
          <select data-calendar-time ${!isAuthenticated || !canCreateAppointments || !selectedDate || !timeOptions.length ? 'disabled' : ''}>
            ${timeOptions
              .map((timeSlot) => `<option value="${timeSlot.start}" ${timeSlot.start === activeTime ? 'selected' : ''}>${escapeHtml(timeSlot.label)}</option>`)
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

      </div>

      ${renderDayHoursScheduleCard(items, {
        service,
        selectedDate,
        slotMinutes,
        workStartHour,
        workEndHour,
        maxAppointmentsPerSlot
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
    .select('id, title, name, telephone, email, notes, attachment_files, appointment_at, created_by')
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
    .select('slot_minutes, work_start_hour, work_end_hour, allow_weekends, max_appointments_per_slot')
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
  const maxAppointmentsPerSlot = configResult.data?.max_appointments_per_slot ?? 1
  const monthReference = root.dataset.calendarMonth || toIsoDateKey(getMonthStart(new Date()))
  const selectedDate = root.dataset.selectedDate || ''
  const selectedTime = root.dataset.selectedTime || ''

  const appointmentsResult = await loadAppointments(supabase, service)
  const effectiveSelectedDate = resolveSelectedCalendarDate({
    service,
    items: appointmentsResult.data,
    monthReference,
    selectedDate,
    allowWeekends,
    isAuthenticated,
    canCreateAppointments
  })
  root.dataset.selectedDate = effectiveSelectedDate

  const currentTimeOptions = getServiceSlotDefinitions({
    service,
    selectedDate: effectiveSelectedDate,
    slotMinutes,
    workStartHour,
    workEndHour
  })
  const currentTimeValues = currentTimeOptions.map((slot) => slot.start)
  const effectiveSelectedTime = currentTimeValues.includes(selectedTime) ? selectedTime : (currentTimeValues[0] || '')
  root.dataset.selectedTime = effectiveSelectedTime

  if (appointmentsList) {
    appointmentsList.innerHTML = `
      ${renderAppointmentCalendar(appointmentsResult.data, {
        service,
        monthReference,
        selectedDate: effectiveSelectedDate,
        selectedTime: effectiveSelectedTime,
        allowWeekends,
        slotMinutes,
        workStartHour,
        workEndHour,
        maxAppointmentsPerSlot,
        isAuthenticated,
        canCreateAppointments
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
        : 'Sign in to create appointments.'
  }

  if (appointmentForm) {
    appointmentForm.classList.toggle('d-none', !isAuthenticated)
    const dateInput = appointmentForm.querySelector('input[name="appointment_at"]')
    if (dateInput) {
      dateInput.step = service === 'pilates' ? '60' : String(slotMinutes * 60)
      dateInput.min = service === 'pilates'
        ? getNextPilatesSlotDateTimeLocal()
        : getNextSlotDateTimeLocal(slotMinutes)
      if (!dateInput.value) {
        dateInput.value = dateInput.min
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

      if (service !== 'pilates' && !isAlignedToSlot(payload.appointment_at, slotMinutes)) {
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

      if (service === 'pilates' && !isPilatesDateTimeAllowed(payload.appointment_at)) {
        if (appointmentsStatus) {
          appointmentsStatus.dataset.type = 'error'
          appointmentsStatus.textContent = 'Selected time is outside the Pilates schedule.'
        }
        return
      }

      payload.appointment_at = toUtcIsoString(payload.appointment_at)

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
    const daySlots = getServiceSlotDefinitions({
      service,
      selectedDate: dateKey,
      slotMinutes,
      workStartHour,
      workEndHour
    })
    const timeValue = root.dataset.selectedTime || daySlots[0]?.start || `${String(workStartHour).padStart(2, '0')}:00`
    if (!dateKey) return

    const localDate = new Date(`${dateKey}T${timeValue}:00`)
    if (Number.isNaN(localDate.getTime())) return

    const nextValue = service === 'pilates'
      ? toDateTimeLocal(localDate.toISOString())
      : alignDateTimeLocal(localDate.toISOString(), slotMinutes)

    dateInput.value = nextValue
  }

  const openAddAppointmentModal = (dateKey, timeValue) => {
    if (!dateKey || !timeValue) return

    if (!isAuthenticated || !canCreateAppointments || !session?.user) {
      if (appointmentsStatus) {
        appointmentsStatus.dataset.type = 'info'
        appointmentsStatus.textContent = 'Sign in as user/admin to create appointments.'
      }
      return
    }

    const modalId = `addAppointmentModal-${service}`
    let modalElement = document.getElementById(modalId)

    if (!modalElement) {
      const modalWrapper = document.createElement('div')
      modalWrapper.innerHTML = `
        <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content auth-modal">
              <div class="modal-header border-0 pb-0">
                <h5 class="modal-title">Add Appointment</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body pt-3">
                <form class="d-grid gap-3" data-modal-appointment-form>
                  <div>
                    <label class="form-label">Name</label>
                    <input type="text" class="form-control" name="name" required />
                  </div>
                  <div>
                    <label class="form-label">Phone Number</label>
                    <input type="text" class="form-control" name="telephone" required />
                  </div>
                  <div>
                    <label class="form-label">Appointment Title</label>
                    <input type="text" class="form-control" name="title" required />
                  </div>
                  <div>
                    <label class="form-label">Date & Time</label>
                    <input type="datetime-local" class="form-control" name="appointment_at" required />
                  </div>
                  <div>
                    <label class="form-label">Notes</label>
                    <input type="text" class="form-control" name="notes" placeholder="Optional" />
                  </div>
                  ${service === 'physiotherapy'
                    ? `
                      <div>
                        <label class="form-label">Upload Files</label>
                        <input
                          type="file"
                          class="form-control"
                          name="attachment_files"
                          data-modal-physio-files
                          accept="image/*,.pdf,.doc,.docx"
                          multiple
                        />
                        <p class="service-note mb-0 mt-2">Optional. Upload up to ${MAX_PHYSIOTHERAPY_FILES} files (${Math.floor(MAX_PHYSIOTHERAPY_FILE_SIZE_BYTES / (1024 * 1024))}MB each).</p>
                      </div>
                    `
                    : ''}
                  <p class="service-note mb-0" data-modal-appointment-status></p>
                  <button type="submit" class="btn btn-primary btn-glow w-100">Add</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      `

      modalElement = modalWrapper.firstElementChild
      if (!modalElement) return
      document.body.appendChild(modalElement)
    }

    const modalForm = modalElement.querySelector('[data-modal-appointment-form]')
    const modalStatus = modalElement.querySelector('[data-modal-appointment-status]')
    const dateInput = modalElement.querySelector('input[name="appointment_at"]')
    const attachmentInput = modalElement.querySelector('[data-modal-physio-files]')
    if (!modalForm || !dateInput) return

    const localDate = new Date(`${dateKey}T${timeValue}:00`)
    const alignedValue = service === 'pilates'
      ? toDateTimeLocal(localDate.toISOString())
      : alignDateTimeLocal(localDate.toISOString(), slotMinutes)

    modalForm.reset()
    if (attachmentInput) {
      attachmentInput.value = ''
    }
    dateInput.step = service === 'pilates' ? '60' : String(slotMinutes * 60)
    if (service === 'pilates') {
      dateInput.min = ''
      dateInput.value = alignedValue
    } else {
      const minSlotValue = getNextSlotDateTimeLocal(slotMinutes)
      dateInput.min = minSlotValue
      dateInput.value = minSlotValue && alignedValue < minSlotValue ? minSlotValue : alignedValue
    }
    if (modalStatus) {
      modalStatus.textContent = ''
      modalStatus.dataset.type = 'info'
    }

    const bootstrapApi = window.bootstrap
    if (!bootstrapApi?.Modal) {
      if (appointmentsStatus) {
        appointmentsStatus.dataset.type = 'error'
        appointmentsStatus.textContent = 'Modal is unavailable in this environment.'
      }
      return
    }

    const modalInstance = bootstrapApi.Modal.getOrCreateInstance(modalElement)

    modalForm.onsubmit = async (event) => {
      event.preventDefault()

      const formData = new FormData(modalForm)
      const selectedFiles = service === 'physiotherapy' && attachmentInput
        ? Array.from(attachmentInput.files || []).filter((file) => file instanceof File)
        : []
      const payload = {
        service,
        name: String(formData.get('name') || '').trim(),
        telephone: String(formData.get('telephone') || '').trim(),
        title: String(formData.get('title') || '').trim(),
        notes: String(formData.get('notes') || '').trim() || null,
        appointment_at: String(formData.get('appointment_at') || '').trim(),
        created_by: session.user.id,
        email: await resolveCurrentUserEmail(supabase, session.user) || null
      }

      if (!payload.name || !payload.telephone || !payload.title || !payload.appointment_at) {
        if (modalStatus) {
          modalStatus.dataset.type = 'error'
          modalStatus.textContent = 'Please fill all required fields.'
        }
        return
      }

      if (service === 'physiotherapy' && selectedFiles.length > MAX_PHYSIOTHERAPY_FILES) {
        if (modalStatus) {
          modalStatus.dataset.type = 'error'
          modalStatus.textContent = `You can upload up to ${MAX_PHYSIOTHERAPY_FILES} files.`
        }
        return
      }

      if (service === 'physiotherapy' && selectedFiles.some((file) => file.size > MAX_PHYSIOTHERAPY_FILE_SIZE_BYTES)) {
        if (modalStatus) {
          modalStatus.dataset.type = 'error'
          modalStatus.textContent = `Each file must be up to ${Math.floor(MAX_PHYSIOTHERAPY_FILE_SIZE_BYTES / (1024 * 1024))}MB.`
        }
        return
      }

      if (service !== 'pilates' && !isAlignedToSlot(payload.appointment_at, slotMinutes)) {
        const nextAligned = alignDateTimeLocal(payload.appointment_at, slotMinutes)
        dateInput.value = nextAligned
        if (modalStatus) {
          modalStatus.dataset.type = 'error'
          modalStatus.textContent = `Time adjusted to match ${slotMinutes}-minute slot boundaries.`
        }
        return
      }

      if (service === 'pilates' && !isPilatesDateTimeAllowed(payload.appointment_at)) {
        if (modalStatus) {
          modalStatus.dataset.type = 'error'
          modalStatus.textContent = 'Selected time is outside the Pilates schedule.'
        }
        return
      }

      payload.appointment_at = toUtcIsoString(payload.appointment_at)

      const { data: createdAppointment, error } = await supabase
        .from('appointments')
        .insert(payload)
        .select('id')
        .single()

      if (error) {
        if (modalStatus) {
          modalStatus.dataset.type = 'error'
          modalStatus.textContent = error.message
        }
        return
      }

      if (service === 'physiotherapy' && selectedFiles.length && createdAppointment?.id) {
        const uploadedPaths = []

        try {
          const attachmentFiles = []

          for (let index = 0; index < selectedFiles.length; index += 1) {
            const file = selectedFiles[index]
            const safeName = sanitizeStorageFileName(file.name)
            const filePath = `${session.user.id}/${createdAppointment.id}/${Date.now()}-${index}-${safeName}`

            const { error: uploadError } = await supabase.storage
              .from(PHYSIOTHERAPY_FILES_BUCKET)
              .upload(filePath, file, {
                upsert: false,
                contentType: file.type || undefined
              })

            if (uploadError) {
              throw new Error(uploadError.message)
            }

            uploadedPaths.push(filePath)

            const { data: publicUrlData } = supabase.storage
              .from(PHYSIOTHERAPY_FILES_BUCKET)
              .getPublicUrl(filePath)

            attachmentFiles.push({
              name: file.name,
              url: publicUrlData?.publicUrl || '',
              path: filePath,
              size: file.size,
              type: file.type || null
            })
          }

          const { error: updateError } = await supabase
            .from('appointments')
            .update({ attachment_files: attachmentFiles })
            .eq('id', createdAppointment.id)

          if (updateError) {
            throw new Error(updateError.message)
          }
        } catch (uploadFailure) {
          if (uploadedPaths.length) {
            await supabase.storage.from(PHYSIOTHERAPY_FILES_BUCKET).remove(uploadedPaths)
          }

          await supabase.from('appointments').delete().eq('id', createdAppointment.id)

          if (modalStatus) {
            modalStatus.dataset.type = 'error'
            modalStatus.textContent = uploadFailure?.message || 'Failed to upload appointment files.'
          }
          return
        }
      }

      modalInstance.hide()
      await renderServiceContent(root, service)
    }

    modalInstance.show()
    window.setTimeout(() => {
      modalForm.querySelector('input[name="name"]')?.focus()
    }, 120)
  }

  const bindHourScheduleHandlers = () => {
    appointmentsList?.querySelectorAll('[data-hour-time]').forEach((hourItem) => {
      const handleHourSelection = () => {
        const dateKey = root.dataset.selectedDate || ''
        const timeValue = String(hourItem.dataset.hourTime || '').trim()
        if (!dateKey || !timeValue) return

        root.dataset.selectedTime = timeValue
        applyDateTimeToInput()

        const timeSelect = appointmentsList.querySelector('[data-calendar-time]')
        if (timeSelect) {
          timeSelect.disabled = !isAuthenticated || !canCreateAppointments
          if (timeSelect.querySelector(`option[value="${timeValue}"]`)) {
            timeSelect.value = timeValue
          }
        }

        openAddAppointmentModal(dateKey, timeValue)
      }

      hourItem.addEventListener('click', handleHourSelection)
      hourItem.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        handleHourSelection()
      })
    })
  }

  appointmentsList?.querySelector('[data-calendar-time]')?.addEventListener('change', (event) => {
    const nextTime = String(event.target.value || '').trim()
    if (!nextTime) return
    root.dataset.selectedTime = nextTime
    applyDateTimeToInput()
  })

  appointmentsList?.querySelectorAll('[data-calendar-date]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (button.disabled) return
      const dateKey = button.dataset.calendarDate
      if (!dateKey) return

      root.dataset.selectedDate = dateKey
      const dayTimeOptions = getServiceSlotDefinitions({
        service,
        selectedDate: dateKey,
        slotMinutes,
        workStartHour,
        workEndHour
      })
      root.dataset.selectedTime = dayTimeOptions[0]?.start || ''
      await renderServiceContent(root, service)
    })
  })

  bindHourScheduleHandlers()

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

      if (service !== 'pilates' && !isAlignedToSlot(nextDate, slotMinutes)) {
        if (appointmentsStatus) {
          appointmentsStatus.dataset.type = 'error'
          appointmentsStatus.textContent = `Time must align to ${slotMinutes}-minute slot boundaries.`
        }
        return
      }

      if (service === 'pilates' && !isPilatesDateTimeAllowed(nextDate)) {
        if (appointmentsStatus) {
          appointmentsStatus.dataset.type = 'error'
          appointmentsStatus.textContent = 'Selected time is outside the Pilates schedule.'
        }
        return
      }

      const { error } = await supabase
        .from('appointments')
        .update({
          name: nextName.trim(),
          telephone: nextTelephone.trim(),
          title: nextTitle.trim(),
          appointment_at: toUtcIsoString(nextDate),
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