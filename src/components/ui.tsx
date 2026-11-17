import { useState, type ReactNode } from 'react';
import { Icon, type IconName } from './Icons';
import type { SavingsPlan } from '../types';
import { formatNaira } from '../data/mock';

export function PageHeader({ title, lead }: { title: string; lead?: string }) {
  return (
    <div className="ph">
      <div className="wrap">
        <h1>{title}</h1>
        {lead && <p>{lead}</p>}
      </div>
    </div>
  );
}

export function Steps({ items }: { items: { title: string; text: string }[] }) {
  return (
    <div className="steps">
      {items.map((s) => (
        <div key={s.title}>
          <span>
            <b>{s.title}</b>
            <p>{s.text}</p>
          </span>
        </div>
      ))}
    </div>
  );
}

export function FeatureCard({ icon, title, children, link }: {
  icon?: IconName;
  title: string;
  children: ReactNode;
  link?: ReactNode;
}) {
  return (
    <div className="card">
      {icon && (
        <div className="ic"><Icon name={icon} /></div>
      )}
      <h3>{title}</h3>
      <p>{children}</p>
      {link}
    </div>
  );
}

export function SavingsPlanCard({ plan, bare }: { plan: SavingsPlan; bare?: boolean }) {
  return (
    <div className={bare ? 'plan' : 'card plan'} style={bare ? { padding: '6px 0', margin: '0 0 6px' } : undefined}>
      <span className="bag"><Icon name="save" /></span>
      <b>{plan.name}</b>
      <span className="amt">{formatNaira(plan.balance)}</span>
      <span className="rate">Interest rate {plan.interestRate.toFixed(1)}%</span>
      <span className="d">{plan.daysToMaturity} days to maturity</span>
      <div className="bar"><i style={{ width: `${plan.progress}%` }} /></div>
    </div>
  );
}

/** Stacked cards used in the hero phone and the dashboard. */
export function CardStack({ savings, accountLabel, accountValue, extra }: {
  savings: string;
  accountLabel: ReactNode;
  accountValue: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <div className="cs">
      <div className="c1">Savings<b>{savings}</b></div>
      <div className="c2">Loan</div>
      <div className="c3">
        Main account<span className="act">Active</span>
        <small>{accountLabel}{extra}</small>
        <em>{accountValue}</em>
      </div>
    </div>
  );
}

export function FileUpload({ label, hint, name, className, accept, onChange }: {
  label: string;
  hint: string;
  name: string;
  className?: string;
  accept?: string;
  onChange?: (file: File | null) => void;
}) {
  const [fileName, setFileName] = useState<string>('');
  return (
    <label className={`up${className ? ' ' + className : ''}`}>
      <b>{label}</b>
      {hint}
      {fileName && <span className="fn">{fileName}</span>}
      <input
        type="file"
        name={name}
        accept={accept ?? 'image/jpeg,image/png,application/pdf'}
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          setFileName(f?.name ?? '');
          onChange?.(f);
        }}
      />
    </label>
  );
}

export function Field({ label, error, className, children }: {
  label?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      {label && <label>{label}</label>}
      {children}
      {error && <span className="err">{error}</span>}
    </div>
  );
}
