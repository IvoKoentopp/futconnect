
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://xxuzbvodswkciqywfejv.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4dXpidm9kc3drY2lxeXdmZWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3MjkyNDYsImV4cCI6MjA1NzMwNTI0Nn0.CBuBhTvHATuVZi92cwtAxZz0WG1W3erIsoSoXEXDQaA";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
    },
    global: {
      headers: {
        'X-Client-Info': 'futconnect-web-app',
      },
    },
  }
);
