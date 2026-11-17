import type { Bindings } from '../env';

interface Mail {
  to: string;
  subject: string;
  text: string;
}

/**
 * Sends email through Resend (free tier: 3,000/month).
 * Without RESEND_API_KEY (local dev), the message is printed to the console instead.
 */
export async function sendEmail(env: Bindings, mail: Mail): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.log(`\n[email:dev] To: ${mail.to}\nSubject: ${mail.subject}\n${mail.text}\n`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: mail.to, subject: mail.subject, text: mail.text }),
  });
  if (!res.ok) console.error('Resend error', res.status, await res.text());
}

export function otpEmail(appName: string, code: string, purpose: 'verify_email' | 'login' | 'reset_password'): Mail['text'] {
  const why =
    purpose === 'verify_email'
      ? 'confirm your email address'
      : purpose === 'login'
        ? 'finish signing in on a new device'
        : 'reset your password';
  return `Your ${appName} code is ${code}\n\nUse it to ${why}. It expires in 10 minutes.\n\nIf you didn't request this, ignore this email. ${appName} will never ask you for this code by phone.`;
}
