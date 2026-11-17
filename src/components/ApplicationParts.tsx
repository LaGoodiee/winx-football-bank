import type { ApplicationDetail } from '../lib/api';
import { api } from '../lib/api';
import { badge, dateTime, fileSize, naira } from '../lib/format';
import { STATUS_LABEL } from '../../shared/domain';

const FIELD_LABELS: Record<string, string> = {
  address: 'Address',
  phone: 'Phone number',
  nin: 'NIN',
  amount: 'Amount',
  option: 'Option',
  purpose: 'Purpose',
};

/** Read-only view of the form data. */
export function DataSummary({ app, maskNin = true }: { app: ApplicationDetail; maskNin?: boolean }) {
  const optionLabel = app.kind === 'loan' ? 'Repayment period' : 'Grant category';
  const entries = Object.entries(app.data).filter(([, v]) => v !== '' && v !== null && v !== undefined);
  return (
    <dl className="kv">
      {entries.map(([k, v]) => (
        <div key={k}>
          <dt>{k === 'option' ? optionLabel : FIELD_LABELS[k] ?? k}</dt>
          <dd>
            {k === 'amount' && typeof v === 'number'
              ? naira(v)
              : k === 'nin' && maskNin && typeof v === 'string'
                ? '•••••••' + v.slice(-4)
                : String(v)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function DocList({ app }: { app: ApplicationDetail }) {
  if (!app.documents.length) return <p className="mut">No documents uploaded.</p>;
  return (
    <ul className="doclist">
      {app.documents.map((d) => {
        const slot = app.slots.find((s) => s.slot === d.slot);
        return (
          <li key={d.id}>
            <div>
              <b>{slot?.label ?? d.slot}</b>
              <span className="mut small">{d.filename} · {fileSize(d.size)}</span>
            </div>
            <a className="btn soft sm" href={api.documentUrl(d.id)} target="_blank" rel="noopener noreferrer">View</a>
          </li>
        );
      })}
    </ul>
  );
}

export function Timeline({ app }: { app: ApplicationDetail }) {
  if (!app.history.length) return null;
  return (
    <ol className="timeline">
      {app.history.map((h, i) => (
        <li key={i}>
          <span className={badge(h.toStatus)}>{STATUS_LABEL[h.toStatus]}</span>
          <span className="mut small">{dateTime(h.createdAt)}</span>
          {h.note && <p>{h.note}</p>}
        </li>
      ))}
    </ol>
  );
}
