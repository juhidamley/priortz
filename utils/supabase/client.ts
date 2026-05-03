import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

const supabaseUrl = `https://qxsyjqquhruqgiwrkppb.supabase.co`;

// Initialize the Supabase client
export const supabase = createClient(supabaseUrl, publicAnonKey);