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

const usersToSeed = [
  { email: 'maria@gmail.com', password: 'pass123', username: 'Maria', role: 'user' },
  { email: 'peter@gmail.com', password: 'pass123', username: 'Peter', role: 'user' },
  { email: 'steve@gmail.com', password: 'pass123', username: 'Steve', role: 'admin' }
]

try {
  console.log('Seeding auth users and roles...')
  const seededUsers = []

  for (const seedUser of usersToSeed) {
    const user = await getOrCreateUserByEmail(seedUser)
    seededUsers.push(user)

    await ensureUserRole(user.id, seedUser.role)
    await ensureUserProfile(user.id, seedUser.username, seedUser.email)

    console.log(`- ${seedUser.email} (${seedUser.role}) ready`)
  }

  const userByEmail = new Map(seededUsers.map((user) => [String(user.email || '').toLowerCase(), user]))

  console.log('Seeding appointments...')
  const appointments = [
    {
      service: 'physiotherapy',
      title: '[Seed] Physio - Maria Knee Check',
      notes: 'Simple seeded appointment',
      appointment_at: '2026-03-02T10:00:00+02:00',
      name: 'Maria Ivanova',
      telephone: '+359888100001',
      email: 'maria.client+1@appointment.local',
      created_by: userByEmail.get('maria@gmail.com')?.id
    },
    {
      service: 'physiotherapy',
      title: '[Seed] Physio - Peter Back Session',
      notes: 'Simple seeded appointment',
      appointment_at: '2026-03-03T11:00:00+02:00',
      name: 'Peter Petrov',
      telephone: '+359888100002',
      email: 'peter.client+1@appointment.local',
      created_by: userByEmail.get('peter@gmail.com')?.id
    },
    {
      service: 'pilates',
      title: '[Seed] Pilates - Steve Morning Group',
      notes: 'Simple seeded appointment',
      appointment_at: '2026-03-03T07:15:00+02:00',
      name: 'Steve Georgiev',
      telephone: '+359888100003',
      email: 'steve.client+1@appointment.local',
      created_by: userByEmail.get('steve@gmail.com')?.id
    },
    {
      service: 'pilates',
      title: '[Seed] Pilates - Maria Noon Group',
      notes: 'Simple seeded appointment',
      appointment_at: '2026-03-05T12:00:00+02:00',
      name: 'Maria Ivanova',
      telephone: '+359888100004',
      email: 'maria.client+2@appointment.local',
      created_by: userByEmail.get('maria@gmail.com')?.id
    }
  ]

  for (const appointment of appointments) {
    if (!appointment.created_by) {
      throw new Error(`Missing created_by for appointment: ${appointment.title}`)
    }

    const alreadyExists = await appointmentExists(appointment)
    if (alreadyExists) {
      console.log(`- Skipped existing appointment: ${appointment.title}`)
      continue
    }

    const { error } = await supabase.from('appointments').insert(appointment)
    if (error) {
      throw new Error(`Failed to insert appointment '${appointment.title}': ${error.message}`)
    }

    console.log(`- Inserted appointment: ${appointment.title}`)
  }

  console.log('Seeding To Do default statuses (Active, Done, Overdue)...')
  const todoDefaults = [
    {
      service: 'physiotherapy',
      title: '[Seed] Active default task',
      description: 'Default Active task for To Do board',
      due_date: toDateInputValue(addDays(new Date(), 2)),
      is_done: false,
      created_by: userByEmail.get('maria@gmail.com')?.id
    },
    {
      service: 'pilates',
      title: '[Seed] Done default task',
      description: 'Default Done task for To Do board',
      due_date: toDateInputValue(addDays(new Date(), 1)),
      is_done: true,
      created_by: userByEmail.get('peter@gmail.com')?.id
    },
    {
      service: 'physiotherapy',
      title: '[Seed] Overdue default task',
      description: 'Default Overdue task for To Do board',
      due_date: toDateInputValue(addDays(new Date(), -2)),
      is_done: false,
      created_by: userByEmail.get('steve@gmail.com')?.id
    }
  ]

  for (const task of todoDefaults) {
    if (!task.created_by) {
      throw new Error(`Missing created_by for task: ${task.title}`)
    }

    const exists = await taskExists(task.title)
    if (exists) {
      console.log(`- Skipped existing task: ${task.title}`)
      continue
    }

    const { error } = await supabase.from('service_tasks').insert(task)
    if (error) {
      throw new Error(`Failed to insert task '${task.title}': ${error.message}`)
    }

    console.log(`- Inserted task: ${task.title}`)
  }

  console.log('Seed completed successfully.')
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

async function getOrCreateUserByEmail(seedUser) {
  const existing = await findUserByEmail(seedUser.email)
  if (existing) {
    return existing
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: seedUser.email,
    password: seedUser.password,
    email_confirm: true,
    user_metadata: {
      username: seedUser.username,
      full_name: seedUser.username,
      contact: seedUser.email
    }
  })

  if (error || !data?.user) {
    throw new Error(`Failed to create auth user '${seedUser.email}': ${error?.message || 'Unknown error'}`)
  }

  return data.user
}

async function findUserByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase()
  if (!normalized) return null

  const perPage = 200
  let page = 1

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) {
      throw new Error(`Failed to list auth users: ${error.message}`)
    }

    const users = data?.users || []
    const match = users.find((user) => String(user.email || '').toLowerCase() === normalized)
    if (match) return match

    if (users.length < perPage) break
    page += 1
  }

  return null
}

async function ensureUserRole(userId, userRole) {
  const { error } = await supabase.from('user_roles').upsert(
    {
      user_id: userId,
      user_role: userRole,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'user_id' }
  )

  if (error) {
    throw new Error(`Failed to upsert user role for ${userId}: ${error.message}`)
  }
}

async function ensureUserProfile(userId, username, contact) {
  const { error } = await supabase.from('user_profiles').upsert(
    {
      user_id: userId,
      username,
      contact,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'user_id' }
  )

  if (error) {
    throw new Error(`Failed to upsert user profile for ${userId}: ${error.message}`)
  }
}

async function appointmentExists(appointment) {
  const { data, error } = await supabase
    .from('appointments')
    .select('id')
    .eq('title', appointment.title)
    .eq('appointment_at', appointment.appointment_at)
    .eq('created_by', appointment.created_by)
    .limit(1)

  if (error) {
    throw new Error(`Failed to check appointment existence '${appointment.title}': ${error.message}`)
  }

  return (data || []).length > 0
}

async function taskExists(title) {
  const { data, error } = await supabase.from('service_tasks').select('id').eq('title', title).limit(1)

  if (error) {
    throw new Error(`Failed to check task existence '${title}': ${error.message}`)
  }

  return (data || []).length > 0
}

function addDays(dateInput, days) {
  const date = new Date(dateInput)
  date.setDate(date.getDate() + days)
  return date
}

function toDateInputValue(dateInput = new Date()) {
  const date = new Date(dateInput)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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