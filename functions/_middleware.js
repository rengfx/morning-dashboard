// Optional key gate (fallback when Cloudflare Access is not used).
// Off unless the ACCESS_KEY secret is set. Open once with https://<site>/?key=<ACCESS_KEY>;
// a cookie then keeps you in for 1 year on that device (and the Home Screen app).

const COOKIE = 'md_key';

async function digest(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

const PUBLIC = new Set(['/api/health', '/robots.txt']);

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  if (!env.ACCESS_KEY || PUBLIC.has(url.pathname)) return next();
  const want = await digest(String(env.ACCESS_KEY).trim()); // trim: a pasted key often ends with a newline
  const cookie = (request.headers.get('cookie') || '').split(/;\s*/).find((c) => c.startsWith(COOKIE + '='));
  if (cookie && cookie.slice(COOKIE.length + 1) === want) return next();
  const key = url.searchParams.get('key');
  if (key && (await digest(key.trim())) === want) {
    url.searchParams.delete('key');
    return new Response(null, {
      status: 302,
      headers: { location: url.pathname + url.search, 'set-cookie': `${COOKIE}=${want}; Max-Age=31536000; Path=/; Secure; HttpOnly; SameSite=Lax` },
    });
  }
  return new Response('Private page.', { status: 401, headers: { 'content-type': 'text/plain' } });
}
