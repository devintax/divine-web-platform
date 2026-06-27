import { randomBytes } from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { createClient } from '@insforge/sdk'

const SUPER_ADMIN_EMAIL = 'admin@dfgworld.com'
const SUPER_ADMIN_NAME = 'DFG Super Admin'
const OUTPUT_FILE = path.resolve(process.cwd(), '.super-admin-credentials.txt')

const INSFORGE_URL = (process.env.NEXT_PUBLIC_INSFORGE_URL || process.env.INSFORGE_URL || 'http://localhost:7130').trim()
const INSFORGE_ANON_KEY = (process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || process.env.INSFORGE_ANON_KEY || '').trim()

if (!INSFORGE_ANON_KEY) {
  throw new Error('Missing InsForge anon key. Set NEXT_PUBLIC_INSFORGE_ANON_KEY or INSFORGE_ANON_KEY.')
}

const insforgeServer = createClient({
  baseUrl: INSFORGE_URL,
  anonKey: INSFORGE_ANON_KEY,
  isServerMode: true,
})

function generatePassword(length = 24): string {
  const charset = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*()_+-='
  const bytes = randomBytes(length)
  return Array.from(bytes)
    .map((b) => charset[b % charset.length])
    .join('')
}

function formatCredentialFile(email: string, password: string) {
  const timestamp = new Date().toISOString()
  return `DIVINE FINANCIAL GROUP — SUPER ADMIN CREDENTIALS\n` +
    `Generated: ${timestamp}\n\n` +
    `Email: ${email}\n` +
    `Password: ${password}\n` +
    `Role: super_admin\n\n` +
    `IMPORTANT: store this file securely and delete it after use.`
}

async function run() {
  const password = generatePassword()
  console.log('Creating Super Admin account...')
  console.log(`Using InsForge URL: ${INSFORGE_URL}`)

  const { data, error } = await insforgeServer.auth.signUp({
    email: SUPER_ADMIN_EMAIL,
    password,
    name: SUPER_ADMIN_NAME,
    autoConfirm: true,
  })

  if (error) {
    throw new Error(`Failed to create auth user: ${error.message || JSON.stringify(error)}`)
  }

  const userId = data?.user?.id
  if (!userId) {
    throw new Error('InsForge did not return a created user ID.')
  }

  const profilePayload = {
    auth_user_id: userId,
    role: 'super_admin',
    email: SUPER_ADMIN_EMAIL,
    legal_name: SUPER_ADMIN_NAME,
    created_at: new Date().toISOString(),
  }

  const { error: profileError } = await insforgeServer.database
    .from('user_profiles')
    .upsert(profilePayload, { onConflict: 'auth_user_id' })

  if (profileError) {
    throw new Error(`Failed to create user profile: ${profileError.message || JSON.stringify(profileError)}`)
  }

  const fileContents = formatCredentialFile(SUPER_ADMIN_EMAIL, password)
  await fs.writeFile(OUTPUT_FILE, fileContents, { encoding: 'utf8', mode: 0o600 })

  console.log(`Super admin created successfully. Credentials saved to ${OUTPUT_FILE}`)
}

run().catch((error) => {
  console.error('Super admin creation failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
