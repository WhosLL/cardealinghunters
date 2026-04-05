import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sbhjuntwwyavdnpsgzjb.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiaGp1bnR3d3lhdmRucHNnempiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNTU2NzMsImV4cCI6MjA5MDkzMTY3M30.dl_6gY4ag0NdlI-yuDjijW_9uc9GP9E-eLp9snHLuZk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
