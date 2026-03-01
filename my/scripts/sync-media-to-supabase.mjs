import { createClient } from '@supabase/supabase-js'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..', '..')
const appRoot = path.resolve(__dirname, '..')

const dryRun = process.argv.includes('--dry-run')

await loadEnvFile(path.join(appRoot, '.env.local'))
await loadEnvFile(path.join(appRoot, '.env'))

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
const mediaBucket = process.env.SUPABASE_MEDIA_BUCKET || 'movephysio-media'

if (!supabaseUrl) {
  console.error('Missing VITE_SUPABASE_URL.')
  process.exit(1)
}

if (!dryRun && !serviceRoleKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_SERVICE_ROLE_KEY).')
  process.exit(1)
}

const imagesRoot = path.join(projectRoot, 'Images')
const videosRoot = path.join(projectRoot, 'Videos')

const imageFiles = await getAllFiles(imagesRoot)
const videoFiles = await getAllFiles(videosRoot)
const files = [
  ...imageFiles.map((filePath) => ({ type: 'Pictures', filePath })),
  ...videoFiles.map((filePath) => ({ type: 'Videos', filePath }))
]

if (files.length === 0) {
  console.log('No media files found in Images/ or Videos/.')
  process.exit(0)
}

const mappedFiles = files.map((entry) => {
  const sourceRoot = entry.type === 'Pictures' ? imagesRoot : videosRoot
  const relativePath = normalizeSlashes(path.relative(sourceRoot, entry.filePath))
  const { category, remainderPath } = resolveCategory(relativePath)
  const targetPath = [entry.type, category, remainderPath].filter(Boolean).join('/')

  return {
    type: entry.type,
    sourcePath: entry.filePath,
    relativePath,
    category,
    targetPath,
    contentType: getContentType(entry.filePath)
  }
})

if (dryRun) {
  console.log(`Dry run complete. ${mappedFiles.length} file(s) mapped to bucket '${mediaBucket}'.`)
  for (const file of mappedFiles) {
    console.log(`${file.relativePath} -> ${file.targetPath}`)
  }
  process.exit(0)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

let uploaded = 0
let failed = 0

for (const file of mappedFiles) {
  try {
    const fileBuffer = await fs.readFile(file.sourcePath)

    const { error } = await supabase.storage
      .from(mediaBucket)
      .upload(file.targetPath, fileBuffer, {
        contentType: file.contentType,
        upsert: true
      })

    if (error) {
      failed += 1
      console.error(`FAILED ${file.targetPath} -> ${error.message}`)
      continue
    }

    uploaded += 1
    console.log(`UPLOADED ${file.targetPath}`)
  } catch (error) {
    failed += 1
    console.error(`FAILED ${file.targetPath} -> ${error instanceof Error ? error.message : String(error)}`)
  }
}

console.log(`Upload finished. Uploaded: ${uploaded}, Failed: ${failed}, Total: ${mappedFiles.length}`)

if (failed > 0) {
  process.exit(1)
}

async function getAllFiles(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    const files = []

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      if (entry.isDirectory()) {
        files.push(...(await getAllFiles(fullPath)))
      } else if (entry.isFile()) {
        files.push(fullPath)
      }
    }

    return files
  } catch {
    return []
  }
}

function resolveCategory(relativePath) {
  const segments = normalizeSlashes(relativePath)
    .split('/')
    .filter(Boolean)

  const first = (segments[0] || '').toLowerCase()

  if (first === 'pilates') {
    return {
      category: 'Pilates',
      remainderPath: segments.slice(1).join('/')
    }
  }

  if (first === 'physiotherapy') {
    return {
      category: 'Physiotherapy',
      remainderPath: segments.slice(1).join('/')
    }
  }

  return {
    category: 'Movephysio',
    remainderPath: segments.join('/')
  }
}

function normalizeSlashes(value) {
  return value.replace(/\\/g, '/')
}

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase()

  const mimeByExtension = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.ogg': 'video/ogg'
  }

  return mimeByExtension[extension] || 'application/octet-stream'
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
