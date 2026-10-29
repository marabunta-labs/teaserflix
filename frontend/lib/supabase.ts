import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Copy .env.example to .env.local and fill in your credentials.',
  );
}

// Todas las apps de Marabunta Labs comparten proyecto de Supabase; cada una vive en su esquema.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, { db: { schema: 'teaserflix' } });

// La cuenta es común a las apps de Marabunta Labs, así que ya no hay un disparador en auth.users que cree el perfil:
// lo crea la propia app la primera vez que alguien entra en ella (sin pisar uno existente).
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    if (!session || (event !== 'SIGNED_IN' && event !== 'INITIAL_SESSION')) return;
    const m = session.user.user_metadata ?? {};
    void supabase.from('profiles').upsert(
      { id: session.user.id, full_name: m.full_name ?? null, avatar_url: m.avatar_url ?? null },
      { onConflict: 'id', ignoreDuplicates: true },
    );
  });
}