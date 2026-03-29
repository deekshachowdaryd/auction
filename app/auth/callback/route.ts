import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';

// CS Note: This is a Next.js Route Handler — a server-side endpoint
// that runs in the Node.js runtime, not the browser.
// When Supabase sends the magic link email, it points to this URL.
// The user clicks the link, lands here, we exchange the token for a
// session cookie, then redirect them to the dashboard.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code                     = searchParams.get('code');

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect to dashboard after successful auth
  return NextResponse.redirect(`${origin}/dashboard`);
}
