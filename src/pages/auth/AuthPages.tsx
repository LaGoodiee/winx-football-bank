import { useCallback, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { safeNext } from '../../auth/guards';
import { Icon } from '../../components/Icons';
import { Turnstile } from '../../components/Turnstile';
import { Field } from '../../components/ui';
import { api, ApiError } from '../../lib/api';
import { isEmail } from '../../lib/format';

function AuthShell({ title, lead, children, foot }: { title: string; lead: string; children: ReactNode; foot?: ReactNode }) {
  return (
    <div className="ph" style={{ minHeight: '70vh' }}>
      <div className="wrap">
        <div className="authbox">
          <Link className="logo" to="/" style={{ marginBottom: 18 }}>
            <Icon name="crest" />
            Winx Football Bank
          </Link>
          <h2>{title}</h2>
          <p className="mut">{lead}</p>
          {children}
          {foot && <div className="authfoot">{foot}</div>}
        </div>
      </div>
    </div>
  );
}

const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');

export function Login() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const { refresh, ready } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string>();
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const onToken = useCallback((t: string | undefined) => setToken(t), []);
  const next = safeNext(sp.get('next'));

  if (ready) return <Navigate to={next} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const r = await api.login({ email, password, turnstileToken: token });
      await refresh();
      nav(r.next ? `/verify?next=${encodeURIComponent(next)}` : next, { replace: true });
    } catch (e2) {
      setErr(errMsg(e2));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Log in"
      lead="Welcome back. We’ll email you a code when you log in on a new device."
      foot={<>New here? <Link to="/signup">Open an account</Link></>}
    >
      <form className="f plain" onSubmit={submit} noValidate>
        <Field className="full" label="Email address">
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field className="full" label="Password">
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Turnstile onToken={onToken} />
        {err && <div className="err-box full">{err}</div>}
        <div className="full row-between">
          <button className="btn" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
          <Link to="/forgot" className="more">Forgot password?</Link>
        </div>
      </form>
    </AuthShell>
  );
}

export function Signup() {
  const nav = useNavigate();
  const { refresh, ready } = useAuth();
  const [f, setF] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [token, setToken] = useState<string>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const onToken = useCallback((t: string | undefined) => setToken(t), []);

  if (ready) return <Navigate to="/dashboard" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v: Record<string, string> = {};
    if (!f.firstName.trim()) v.firstName = 'Enter your first name.';
    if (!f.lastName.trim()) v.lastName = 'Enter your last name.';
    if (!isEmail(f.email)) v.email = 'Enter a valid email address.';
    if (f.password.length < 10 || !/\d/.test(f.password) || !/[a-z]/i.test(f.password))
      v.password = 'Use at least 10 characters, with letters and a number.';
    setErrors(v);
    if (Object.keys(v).length) return;
    setErr('');
    setBusy(true);
    try {
      await api.signup({ ...f, turnstileToken: token });
      await refresh();
      nav('/verify?next=/dashboard/open-account', { replace: true });
    } catch (e2) {
      setErr(errMsg(e2));
    } finally {
      setBusy(false);
    }
  };

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <AuthShell
      title="Create your login"
      lead="Step 1 of 2. After this you’ll choose a player, club or academy account and upload your documents."
      foot={<>Already have an account? <Link to="/login">Log in</Link></>}
    >
      <form className="f plain" onSubmit={submit} noValidate>
        <Field label="First name" error={errors.firstName}>
          <input autoComplete="given-name" value={f.firstName} onChange={set('firstName')} />
        </Field>
        <Field label="Last name" error={errors.lastName}>
          <input autoComplete="family-name" value={f.lastName} onChange={set('lastName')} />
        </Field>
        <Field className="full" label="Email address" error={errors.email}>
          <input type="email" autoComplete="email" value={f.email} onChange={set('email')} />
        </Field>
        <Field className="full" label="Password" error={errors.password}>
          <input type="password" autoComplete="new-password" value={f.password} onChange={set('password')} />
        </Field>
        <Turnstile onToken={onToken} />
        {err && <div className="err-box full">{err}</div>}
        <p className="full mut small">
          By continuing you agree to our <Link to="/terms">terms</Link> and <Link to="/privacy">privacy policy</Link>.
        </p>
        <div className="full">
          <button className="btn" disabled={busy}>{busy ? 'Creating…' : 'Continue'}</button>
        </div>
      </form>
    </AuthShell>
  );
}

export function Verify() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const { user, next, refresh, loading } = useAuth();
  const [code, setCode] = useState('');
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const dest = safeNext(sp.get('next'));

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!next) return <Navigate to={dest} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await api.verify(code.trim(), remember);
      await refresh();
      nav(dest, { replace: true });
    } catch (e2) {
      setErr(errMsg(e2));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setErr('');
    try {
      await api.resend();
      setInfo('A new code is on its way.');
    } catch (e2) {
      setErr(errMsg(e2));
    }
  };

  return (
    <AuthShell
      title={next === 'verify_email' ? 'Confirm your email' : 'Enter your login code'}
      lead={`We sent a 6-digit code to ${user.email}. It expires in 10 minutes.`}
    >
      <form className="f plain" onSubmit={submit} noValidate>
        <Field className="full" label="6-digit code">
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            className="otp"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
        </Field>
        <label className="full check">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Trust this device for 90 days
        </label>
        {err && <div className="err-box full">{err}</div>}
        {info && <div className="ok-msg">{info}</div>}
        <div className="full row-between">
          <button className="btn" disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Confirm'}</button>
          <button type="button" className="linkbtn" onClick={resend}>Send a new code</button>
        </div>
      </form>
    </AuthShell>
  );
}

export function Forgot() {
  const nav = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string>();
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const onToken = useCallback((t: string | undefined) => setToken(t), []);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!isEmail(email)) return setErr('Enter a valid email address.');
    setErr('');
    setBusy(true);
    try {
      await api.forgot(email, token);
      setStep(2);
    } catch (e2) {
      setErr(errMsg(e2));
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await api.reset({ email, code, password });
      nav('/login', { replace: true });
    } catch (e2) {
      setErr(errMsg(e2));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      lead={step === 1 ? 'We’ll email you a code to reset your password.' : `If ${email} has an account, a code is on its way.`}
      foot={<Link to="/login">Back to log in</Link>}
    >
      {step === 1 ? (
        <form className="f plain" onSubmit={send} noValidate>
          <Field className="full" label="Email address">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Turnstile onToken={onToken} />
          {err && <div className="err-box full">{err}</div>}
          <div className="full"><button className="btn" disabled={busy}>Send code</button></div>
        </form>
      ) : (
        <form className="f plain" onSubmit={reset} noValidate>
          <Field className="full" label="6-digit code">
            <input inputMode="numeric" maxLength={6} className="otp" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          </Field>
          <Field className="full" label="New password">
            <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {err && <div className="err-box full">{err}</div>}
          <div className="full"><button className="btn" disabled={busy}>Set new password</button></div>
        </form>
      )}
    </AuthShell>
  );
}
