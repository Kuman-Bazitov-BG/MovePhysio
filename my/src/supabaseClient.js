import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from './config.js'

const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()

const hasConfig =
  Boolean(supabaseUrl && supabaseAnonKey) &&
  !/your-project-ref|your-anon-key|your-publishable-key/i.test(`${supabaseUrl} ${supabaseAnonKey}`)

const supabase = hasConfig ? createClient(supabaseUrl, supabaseAnonKey) : null

const missingConfigMessage =
  'Supabase config is missing or still using placeholders. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY). On Netlify, SUPABASE_URL and SUPABASE_ANON_KEY are also supported. Then rebuild/redeploy.'

export { supabase, hasConfig, missingConfigMessage }
