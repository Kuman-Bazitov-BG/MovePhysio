import { createClient } from '@supabase/supabase-js'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const appRoot = path.resolve(__dirname, '..')

await loadEnvFile(path.join(appRoot, '.env.local'))
await loadEnvFile(path.join(appRoot, '.env'))

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  console.error('Missing VITE_SUPABASE_URL.')
  process.exit(1)
}

if (!serviceRoleKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_SERVICE_ROLE_KEY).')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)
const seedTag = '[seed:demo_v1]'

const usersToEnsure = [
  {
    email: 'maria@gmail.com',
    password: 'pass123',
    role: 'user',
    metadata: {
      username: 'maria',
      full_name: 'Maria',
      contact: 'maria@gmail.com'
    }
  },
  {
    email: 'peter@gmail.com',
    password: 'pass123',
    role: 'user',
    metadata: {
      username: 'peter',
      full_name: 'Peter',
      contact: 'peter@gmail.com'
    }
  },
  {
    email: 'steve@gmail.com',
    password: 'pass123',
    role: 'admin',
    metadata: {
      username: 'steve',
      full_name: 'Steve',
      contact: 'steve@gmail.com'
    }
  }
]

const userByEmail = new Map()
for (const userInput of usersToEnsure) {
  const user = await ensureUser(userInput)
  userByEmail.set(userInput.email, user)

  await ensureUserRole(user.id, userInput.role)
  await ensureUserProfile(user.id, userInput.metadata)
}

const baseDate = nextIsoWeekday(1)
const appointmentSeeds = [
  {
    service: 'physiotherapy',
    title: 'Initial Physiotherapy Assessment',
    notes: `${seedTag} Maria initial checkup`,
    appointment_at: withSofiaOffset(baseDate, 10, 0),
    ownerEmail: 'maria@gmail.com',
    name: 'Maria',
    telephone: '+359888000111',
    email: 'maria@gmail.com'
  },
  {
    service: 'physiotherapy',
    title: 'Lower Back Follow-up Session',
    notes: `${seedTag} Peter follow-up`,
    appointment_at: withSofiaOffset(baseDate, 11, 0),
    ownerEmail: 'peter@gmail.com',
    name: 'Peter',
    telephone: '+359888000222',
    email: 'peter@gmail.com'
  },
  {
    service: 'physiotherapy',
    title: 'Mobility and Recovery Plan',
    notes: `${seedTag} Steve review`,
    appointment_at: withSofiaOffset(baseDate, 12, 0),
    ownerEmail: 'steve@gmail.com',
    name: 'Steve',
    telephone: '+359888000333',
    email: 'steve@gmail.com'
  },
  {
    service: 'physiotherapy',
    title: 'Strength and Posture Session',
    notes: `${seedTag} Maria second session`,
    appointment_at: withSofiaOffset(baseDate, 13, 0),
    ownerEmail: 'maria@gmail.com',
    name: 'Maria',
    telephone: '+359888000111',
    email: 'maria+session2@gmail.com'
  }
]

const seededAppointments = []
for (const seed of appointmentSeeds) {
  const owner = userByEmail.get(seed.ownerEmail)
  if (!owner) {
    throw new Error(`Owner not found for appointment: ${seed.ownerEmail}`)
  }

  const appointment = await ensureAppointment({
    service: seed.service,
    title: seed.title,
    notes: seed.notes,
    appointment_at: seed.appointment_at,
    created_by: owner.id,
    name: seed.name,
    telephone: seed.telephone,
    email: seed.email,
    attachment_files: []
  })

  seededAppointments.push(appointment)
}

await applyTaskBoardStatuses(seededAppointments)

console.log('Seed completed successfully.')
console.log('Users: maria@gmail.com, peter@gmail.com, steve@gmail.com')
console.log('Admin role ensured for: steve@gmail.com')
console.log(`Appointments ensured: ${seededAppointments.length}`)
console.log('Task board defaults applied: Active, Done, Overdue')

async function ensureUser({ email, password, metadata }) {
  const existing = await getUserByEmail(email)
  if (existing) {
    return existing
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata
  })

  if (error) {
    const alreadyExists = /already|exists|registered/i.test(error.message || '')
    if (!alreadyExists) {
      throw new Error(`Failed to create user ${email}: ${error.message}`)
    }

    const fallbackUser = await getUserByEmail(email)
    if (!fallbackUser) {
      throw new Error(`User ${email} appears to exist, but could not be loaded.`)
    }

    return fallbackUser
  }

  if (!data?.user) {
    throw new Error(`Failed to create user ${email}: empty response.`)
  }

  return data.user
}

async function getUserByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase()
  let page = 1

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) {
      throw new Error(`Failed to list users: ${error.message}`)
    }

    const users = data?.users || []
    const found = users.find((item) => String(item.email || '').trim().toLowerCase() === normalized)
    if (found) {
      return found
    }

    if (users.length < 200) {
      return null
    }

    page += 1
  }
}

async function ensureUserRole(userId, role) {
  const { error } = await supabase.from('user_roles').upsert(
    {
      user_id: userId,
      user_role: role,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'user_id' }
  )

  if (error) {
    throw new Error(`Failed to upsert user role for ${userId}: ${error.message}`)
  }
}

async function ensureUserProfile(userId, metadata) {
  const { error } = await supabase.from('user_profiles').upsert(
    {
      user_id: userId,
      username: metadata.username,
      contact: metadata.contact,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'user_id' }
  )

  if (error) {
    throw new Error(`Failed to upsert user profile for ${userId}: ${error.message}`)
  }
}

async function ensureAppointment(payload) {
  const { data: existing, error: selectError } = await supabase
    .from('appointments')
    .select('id, service, title, notes, appointment_at, created_by, name, telephone, email')
    .eq('created_by', payload.created_by)
    .eq('title', payload.title)
    .eq('appointment_at', payload.appointment_at)
    .maybeSingle()

  if (selectError) {
    throw new Error(`Failed checking existing appointment "${payload.title}": ${selectError.message}`)
  }

  if (existing) {
    return existing
  }

  const { data, error } = await supabase
    .from('appointments')
    .insert(payload)
    .select('id, service, title, notes, appointment_at, created_by, name, telephone, email')
    .single()

  if (error) {
    throw new Error(`Failed to insert appointment "${payload.title}": ${error.message}`)
  }

  return data
}

async function applyTaskBoardStatuses(appointments) {
  const today = new Date()
  const tomorrow = dateOnly(addDays(today, 1))
  const yesterday = dateOnly(addDays(today, -1))
  const inFiveDays = dateOnly(addDays(today, 5))

  const statusPlan = [
    { is_done: false, due_date: tomorrow },
    { is_done: true, due_date: today.toISOString().slice(0, 10) },
    { is_done: false, due_date: yesterday },
    { is_done: false, due_date: inFiveDays }
  ]

  for (let i = 0; i < appointments.length; i += 1) {
    const appointment = appointments[i]
    const desired = statusPlan[i]
    if (!appointment?.id || !desired) {
      continue
    }

    const { data: task, error: taskError } = await supabase
      .from('service_tasks')
      .select('id, created_by')
      .eq('source_appointment_id', appointment.id)
      .maybeSingle()

    if (taskError) {
      throw new Error(`Failed to load task for appointment ${appointment.id}: ${taskError.message}`)
    }

    if (!task?.id) {
      continue
    }

    const { error: updateError } = await supabase
      .from('service_tasks')
      .update({
        is_done: desired.is_done,
        due_date: desired.due_date,
        created_by: appointment.created_by,
        updated_at: new Date().toISOString()
      })
      .eq('id', task.id)

    if (updateError) {
      throw new Error(`Failed to update task ${task.id}: ${updateError.message}`)
    }
  }
}

function nextIsoWeekday(targetIsoDow) {
  const current = new Date()
  const date = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate()))

  while (true) {
    const isoDow = ((date.getUTCDay() + 6) % 7) + 1
    if (isoDow === targetIsoDow) {
      return date
    }

    date.setUTCDate(date.getUTCDate() + 1)
  }
}

function withSofiaOffset(dateUtc, hour, minute) {
  const year = dateUtc.getUTCFullYear()
  const month = String(dateUtc.getUTCMonth() + 1).padStart(2, '0')
  const day = String(dateUtc.getUTCDate()).padStart(2, '0')
  const hh = String(hour).padStart(2, '0')
  const mm = String(minute).padStart(2, '0')

  return `${year}-${month}-${day}T${hh}:${mm}:00+02:00`
}

function addDays(dateInput, days) {
  const date = new Date(dateInput)
  date.setDate(date.getDate() + days)
  return date
}

function dateOnly(dateInput) {
  return new Date(dateInput).toISOString().slice(0, 10)
}

async function loadEnvFile(filePath) {
  try {
    const fileContent = await fs.readFile(filePath, 'utf8')

    for (const line of fileContent.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) {
        continue
      }

      const separatorIndex = trimmed.indexOf('=')
      if (separatorIndex === -1) {
        continue
      }

      const key = trimmed.slice(0, separatorIndex).trim()
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')

      if (key && process.env[key] === undefined) {
        process.env[key] = value
      }
    }
  } catch {
    return
  }
}
