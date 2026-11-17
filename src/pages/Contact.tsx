import { useState, type FormEvent } from 'react';
import { Field, PageHeader } from '../components/ui';
import { api, type ContactMessage } from '../lib/api';
import { isEmail, required, type Errors } from '../lib/validate';

const EMPTY: ContactMessage = { name: '', email: '', message: '' };

export default function Contact() {
  const [form, setForm] = useState<ContactMessage>(EMPTY);
  const [errors, setErrors] = useState<Errors<ContactMessage>>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    const e: Errors<ContactMessage> = {};
    if (!required(form.name)) e.name = 'Enter your name.';
    if (!isEmail(form.email)) e.email = 'Enter a valid email address.';
    if (!required(form.message)) e.message = 'Write a message.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const res = await api.sendContact(form);
    setBusy(false);
    if (res.ok) {
      setSent(true);
      setForm(EMPTY);
    }
  };

  return (
    <>
      <PageHeader title="Contact us" lead="Our support team answers players, clubs and academies." />
      <section className="s">
        <div className="wrap split">
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="card"><h3>Telephone</h3><p>+234 800 000 0000</p></div>
            <div className="card"><h3>Email</h3><p>support@winxfootballbank.com</p></div>
            <div className="card"><h3>Office</h3><p>Winx Football Bank House, Football Avenue, Lagos, Nigeria</p></div>
            <div className="card"><h3>Support hours</h3><p>Monday to Saturday, 8am to 6pm.</p></div>
          </div>
          <form className="f" style={{ gridTemplateColumns: '1fr' }} onSubmit={onSubmit} noValidate>
            <Field label="Your name" error={errors.name}>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Email address" error={errors.email}>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Message" error={errors.message}>
              <textarea rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            </Field>
            {sent && <div className="ok-msg">Thanks, your message has been sent.</div>}
            <div>
              <button className="btn" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send message'}</button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
