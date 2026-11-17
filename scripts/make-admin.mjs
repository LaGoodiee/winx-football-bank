// Usage: npm run make-admin:local -- you@example.com
//        npm run make-admin:remote -- you@example.com
import { execFileSync } from 'node:child_process';

const target = process.argv[2];
const email = (process.argv[3] ?? '').trim().toLowerCase();
if (!['--local', '--remote'].includes(target) || !/^[^\s@']+@[^\s@']+\.[^\s@']+$/.test(email)) {
  console.error('Usage: npm run make-admin:local -- you@example.com');
  process.exit(1);
}
execFileSync(
  'npx',
  ['wrangler', 'd1', 'execute', 'winx-db', target, '--command', `UPDATE users SET role = 'admin' WHERE email = '${email}'`],
  { stdio: 'inherit' },
);
console.log(`\n${email} is now an admin (if that account exists). Log out and back in.`);
