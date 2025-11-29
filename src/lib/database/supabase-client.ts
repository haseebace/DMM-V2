import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Lightweight Supabase client helper.
// Falls back to anon key when service role is not required.
export function getSupabaseClient(useServiceRole = false): SupabaseClient {
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.SUPABASE_ANON_KEY

  if (!url) {
    throw new Error('SUPABASE_URL is not configured')
  }

  const key = useServiceRole ? serviceKey || anonKey : anonKey || serviceKey
  if (!key) {
    throw new Error('Supabase key is not configured')
  }

  return createClient(url, key)
}
