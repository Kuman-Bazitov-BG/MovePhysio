const config = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || __SUPABASE_URL__ || '',
  supabaseAnonKey:
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    __SUPABASE_ANON_KEY__ ||
    ''
}

export function getSupabaseConfig() {
  return config
}
