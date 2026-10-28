import { FINAL, finalFor, norm, tokens } from '../lib/utils';
import { Icon } from './Icon';
import React from 'react';

export const inputCls = 'w-full h-12 rounded-xl border border-stone-300 bg-white px-3 text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:ring-stone-200';
export const btnPrimary = 'inline-flex h-12 min-w-[48px] items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 text-base font-semibold text-white transition active:scale-[.98] dark:bg-stone-100 dark:text-stone-900';
export const btnGhost = 'inline-flex h-12 min-w-[48px] items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 text-base font-medium text-stone-800 transition active:scale-[.98] dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100';
export const btnDanger = 'inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-red-300 px-4 text-base font-semibold text-red-700 transition active:scale-[.98] dark:border-red-800 dark:text-red-300';
export const cardCls = 'rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900';

export const STATUS_STYLE = {
  'Přijato': 'bg-sky-600 text-white dark:bg-sky-500 dark:text-sky-950',
  'Hotovo': 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950',
  'Odesláno': 'bg-stone-600 text-white dark:bg-stone-400 dark:text-stone-950',
  'Odevzdáno': 'bg-stone-600 text-white dark:bg-stone-400 dark:text-stone-950',
  'Stornováno': 'bg-rose-600 text-white dark:bg-rose-500 dark:text-rose-950',
};
export const STATUS_SOFT = {
  'Přijato': 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
  'Hotovo': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  'Odesláno': 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  'Odevzdáno': 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  'Stornováno': 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
};

export function StatusBadge({ status }) {
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_SOFT[status]}`}>{status}</span>;
}

/* Stav platby: rychlé tlačítko na kartě, přepínač v detailu a formuláři, drobný odznak v seznamu */
export function PaidToggle({ paid, onToggle }) {
  return (
    <button type="button" aria-pressed={paid} onClick={onToggle}
      className={`inline-flex h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition active:scale-95 ${paid ? 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'border-stone-300 bg-stone-100 text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300'}`}>
      <Icon name="wallet" size={18} />{paid ? 'Zaplaceno' : 'Nezaplaceno'}
    </button>
  );
}
export function PaidBadge({ paid }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${paid ? 'text-emerald-700 dark:text-emerald-300' : 'text-stone-500 dark:text-stone-400'}`}>
      <Icon name="wallet" size={14} />{paid ? 'Zaplaceno' : 'Nezaplaceno'}
    </span>
  );
}
export function PaidSwitch({ paid, onChange }) {
  return (
    <button type="button" role="switch" aria-checked={paid} onClick={() => onChange(!paid)} className="flex min-h-[48px] w-full items-center justify-between gap-3 rounded-xl text-left">
      <span className="flex items-center gap-2 text-base font-semibold text-stone-800 dark:text-stone-100">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${paid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'}`}><Icon name="wallet" size={18} /></span>
        Zaplaceno
      </span>
      <span className={`flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition ${paid ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-stone-300 dark:bg-stone-700'}`}>
        <span className={`h-6 w-6 rounded-full bg-white shadow transition-transform dark:bg-stone-900 ${paid ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  );
}
export function CopyCarrierButton({ onClick, full }) {
  return (
    <button type="button" onClick={onClick} className={`${btnGhost} h-11 px-3 text-sm font-semibold ${full ? 'w-full' : ''}`}>
      <Icon name="copy" size={18} />Kopírovat pro dopravce
    </button>
  );
}

export function Segmented({ options, value, onChange, activeClass, label }) {
  return (
    <div role="group" aria-label={label} className="grid gap-1 rounded-xl bg-stone-100 p-1 dark:bg-stone-800/70" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button key={o.value} type="button" aria-pressed={active} onClick={() => onChange(o.value)}
            className={`h-11 rounded-lg px-1 text-sm font-semibold transition ${active ? (activeClass ? activeClass(o.value) : 'bg-white text-stone-900 shadow-sm dark:bg-stone-700 dark:text-white') : 'text-stone-600 dark:text-stone-300'}`}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* Rychlé přepínání stavu: Přijato ➔ Hotovo ➔ Odesláno / Odevzdáno (podle způsobu předání) */
export function StatusControl({ value, method, onChange }) {
  const fin = finalFor(method);
  const current = FINAL.includes(value) ? fin : value;
  return <Segmented label="Stav zakázky" options={[{ value: 'Přijato', label: 'Přijato' }, { value: 'Hotovo', label: 'Hotovo' }, { value: fin, label: fin }]} value={current} onChange={onChange} activeClass={(v) => STATUS_STYLE[v]} />;
}

export function Field({ label, htmlFor, error, children, hint }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-stone-700 dark:text-stone-300">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-stone-500 dark:text-stone-400">{hint}</p>}
      {error && <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

export function Highlight({ text, query }) {
  const toks = tokens(query);
  if (!toks.length || !text) return text || null;
  const n = norm(text);
  if (n.length !== text.length) return text;
  const marks = new Array(text.length).fill(false);
  toks.forEach((t) => { let i = n.indexOf(t); while (i !== -1) { for (let k = i; k < i + t.length; k++) marks[k] = true; i = n.indexOf(t, i + 1); } });
  const out = []; let start = 0;
  for (let i = 1; i <= text.length; i++) {
    if (i === text.length || marks[i] !== marks[start]) {
      const seg = text.slice(start, i);
      out.push(marks[start] ? <mark key={start} className="rounded bg-yellow-200 px-0.5 text-inherit dark:bg-yellow-400/30">{seg}</mark> : <React.Fragment key={start}>{seg}</React.Fragment>);
      start = i;
    }
  }
  return <>{out}</>;
}

