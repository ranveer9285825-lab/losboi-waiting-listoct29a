import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iicnaktsggtwsucgddui.supabase.co'
const supabaseAnonKey = 'sb_publishable_y2xfsHjwXKu1ef4a_-WdmA_augfgC_I'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
