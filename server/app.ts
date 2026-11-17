import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { secureHeaders } from 'hono/secure-headers';
import type { AppEnv } from './env';
import { loadSessionUser } from './lib/session';
import { auth } from './routes/auth';
import { profiles } from './routes/profiles';
import { applications } from './routes/applications';
import { admin } from './routes/admin';
import { pub } from './routes/public';

export const app = new Hono<AppEnv>().basePath('/api');

app.use('*', secureHeaders());

// CSRF protection: state-changing requests must come from this site.
app.use('*', async (c, next) => {
  const m = c.req.method;
  if (m !== 'GET' && m !== 'HEAD' && !c.req.path.startsWith('/api/webhooks/')) {
    const origin = c.req.header('Origin');
    const host = new URL(c.req.url).host;
    if (!origin || new URL(origin).host !== host) return c.json({ error: 'Cross-site request blocked.' }, 403);
  }
  await next();
});

app.use('*', async (c, next) => {
  c.set('user', await loadSessionUser(c));
  await next();
});

app.route('/auth', auth);
app.route('/admin', admin);
app.route('/', pub);
app.route('/', applications);
app.route('/', profiles);

app.notFound((c) => c.json({ error: 'Not found.' }, 404));

app.onError((err, c) => {
  if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
  console.error(err);
  return c.json({ error: 'Something went wrong. Please try again.' }, 500);
});
