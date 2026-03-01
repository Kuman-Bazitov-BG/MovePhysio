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
const anonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  console.error('Missing VITE_SUPABASE_URL.')
  process.exit(1)
}

if (!anonKey) {
  console.error('Missing VITE_SUPABASE_ANON_KEY.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

const seedTag = '[seed:demo_v2]'

const usersToEnsure = [
  {
    email: 'maria@gmail.com',
    password: 'pass123',
    role: 'user',
    metadata: { username: 'maria', full_name: 'Maria', contact: 'maria@gmail.com' }
  },
  {
    email: 'peter@gmail.com',
    password: 'pass123',
    role: 'user',
    metadata: { username: 'peter', full_name: 'Peter', contact: 'peter@gmail.com' }
  },
  {
    email: 'steve@gmail.com',
    password: 'pass123',
    role: 'admin',
    metadata: { username: 'steve', full_name: 'Steve', contact: 'steve@gmail.com' }
  }
]

const userByEmail = new Map()
for (const userInput of usersToEnsure) {
  const user = await ensureUser(userInput)
  userByEmail.set(userInput.email, { ...user, password: userInput.password, role: userInput.role })
  await withSignedInUser(userInput.email, userInput.password, async ({ user: sessionUser }) => {
    await ensureOwnUserProfile(sessionUser.id, userInput.metadata)
  })
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

  const appointment = await withSignedInUser(seed.ownerEmail, owner.password, async ({ user: sessionUser }) => {
    return await ensureAppointmentForSignedInUser({
      service: seed.service,
      title: seed.title,
      notes: seed.notes,
      appointment_at: seed.appointment_at,
      created_by: sessionUser.id,
      name: seed.name,
      telephone: seed.telephone,
      email: seed.email,
      attachment_files: []
    })
  })

  seededAppointments.push(appointment)
}

await tryEnsureSteveAdminRole('steve@gmail.com', 'pass123')
await tryApplyTaskBoardStatusesAsSteve('steve@gmail.com', 'pass123', seededAppointments)

console.log('Seed run completed.')
console.log('Users ensured: maria@gmail.com, peter@gmail.com, steve@gmail.com')
console.log(`Appointments ensured: ${seededAppointments.length}`)

async function ensureUser({ email, password, metadata }) {
  const signInTry = await supabase.auth.signInWithPassword({ email, password })
  if (signInTry.data?.user) {
    await supabase.auth.signOut()
    return signInTry.data.user
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata }
  })

  if (error) {
    const alreadyRegistered = /already registered|already exists|already/i.test(error.message || '')
    if (!alreadyRegistered) {
      throw new Error(`Failed to sign up user ${email}: ${error.message}`)
    }

    const secondSignIn = await supabase.auth.signInWithPassword({ email, password })
    if (!secondSignIn.data?.user) {
      throw new Error(`User ${email} exists but sign-in failed: ${secondSignIn.error?.message || 'Unknown error'}`)
    }

    await supabase.auth.signOut()
    return secondSignIn.data.user
  }

  if (!data?.user) {
    throw new Error(`Sign up response missing user for ${email}.`)
  }

  await supabase.auth.signOut()
  return data.user
}

async function ensureOwnUserProfile(userId, metadata) {
  const { error } = await supabase.from('user_profiles').upsert(
    {
      user_id: userId,
      full_name: metadata.full_name,
      username: metadata.username,
      contact: metadata.contact,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'user_id' }
  )

  if (error) {
    throw new Error(`Failed to upsert own user profile for ${userId}: ${error.message}`)
  }
}

async function ensureAppointmentForSignedInUser(payload) {
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

  if (existing) return existing

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

async function tryEnsureSteveAdminRole(email, password) {
  await withSignedInUser(email, password, async ({ user }) => {
    const { error } = await supabase
      .from('user_roles')
      .upsert({ user_id: user.id, user_role: 'admin', updated_at: new Date().toISOString() }, { onConflict: 'user_id' })

    if (error) {
      console.warn(`Could not set Steve as admin with anon key: ${error.message}`)
      return
    }

    console.log('Steve admin role upserted via authenticated session.')
  })
}

async function tryApplyTaskBoardStatusesAsSteve(email, password, appointments) {
  await withSignedInUser(email, password, async () => {
    await applyTaskBoardStatuses(appointments)
  })
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
    if (!appointment?.id || !desired) continue

    const { data: task, error: taskError } = await supabase
      .from('service_tasks')
      .select('id')
      .eq('source_appointment_id', appointment.id)
      .maybeSingle()

    if (taskError) {
      console.warn(`Could not load task for appointment ${appointment.id}: ${taskError.message}`)
      continue
    }

    if (!task?.id) continue

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
      console.warn(`Could not update task ${task.id} (likely admin-only): ${updateError.message}`)
    }
  }
}

async function withSignedInUser(email, password, action) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data?.user) {
    throw new Error(`Failed sign-in for ${email}: ${error?.message || 'Unknown error'}`)
  }

  try {
    return await action({ user: data.user })
  } finally {
    await supabase.auth.signOut()
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
      if (!trimmed || trimmed.startsWith('#')) continue

      const separatorIndex = trimmed.indexOf('=')
      if (separatorIndex === -1) continue

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
