import { finalFor, fmtDate, fmtMoney, typeNameOf } from '../lib/utils';
import { Icon } from './Icon';
import { DeadlineChip } from './ListScreen';
import { CopyCarrierButton, PaidSwitch, StatusBadge, StatusControl, btnDanger, btnGhost, btnPrimary, cardCls } from './ui';
import { useState } from 'react';

export function InfoRow({ icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"><Icon name={icon} size={16} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">{label}</p>
        <div className="break-words text-base text-stone-900 dark:text-stone-100">{children}</div>
      </div>
    </div>
  );
}

export function DetailScreen({ order: o, types, onBack, onEdit, onStatus, onCopy, onPaid }) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const storno = o.status === 'Stornováno';
  const pickup = o.delivery_method === 'pickup';
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button type="button" className={btnGhost} onClick={onBack}><Icon name="back" size={20} />Zpět</button>
        <button type="button" className={btnPrimary} onClick={() => onEdit(o)}><Icon name="pencil" size={18} />Upravit</button>
      </div>

      <section className={`${cardCls} p-4`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-bold leading-tight">{o.customer_name}</h2>
            <p className="mt-1 text-sm tabular-nums text-stone-500 dark:text-stone-400">{o.id} · vytvořeno {fmtDate(o.created_at)}</p>
          </div>
          <StatusBadge status={o.status} />
        </div>
        <div className="mt-2 divide-y divide-stone-100 dark:divide-stone-800">
          <InfoRow icon="phone" label="Kontakt">{o.customer_contact || <span className="text-stone-400 dark:text-stone-500">neuvedeno</span>}</InfoRow>
          <InfoRow icon={pickup ? 'bag' : 'truck'} label={pickup ? 'Předání' : 'Doručení'}>
            {pickup ? 'Osobní odběr' : (o.delivery_address || <span className="text-stone-400 dark:text-stone-500">adresa neuvedena</span>)}
          </InfoRow>
          <InfoRow icon="calendar" label="Termín"><DeadlineChip order={o} /></InfoRow>
        </div>
        {!pickup && !storno && <div className="mt-3"><CopyCarrierButton full onClick={() => onCopy(o)} /></div>}
      </section>

      <section className={`${cardCls} space-y-3 p-4`}>
        <h3 className="font-display text-lg font-bold">Výrobky</h3>
        <ul className="divide-y divide-stone-100 dark:divide-stone-800">
          {o.items.map((i) => (
            <li key={i.id} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="font-semibold tabular-nums">{i.quantity}× {typeNameOf(types, i.product_type_id)}</p>
                {i.inscription && <p className="text-[15px] text-stone-600 dark:text-stone-400">„{i.inscription}“</p>}
              </div>
              {o.pricing_mode === 'per_item' && (
                <div className="shrink-0 text-right tabular-nums">
                  <p className="font-semibold">{fmtMoney(i.quantity * i.unit_price)}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">{fmtMoney(i.unit_price)} / ks</p>
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="flex items-baseline justify-between gap-3 rounded-xl bg-stone-100 px-4 py-3 dark:bg-stone-800/70">
          <span className="text-sm font-semibold text-stone-600 dark:text-stone-300">Cena celkem · {o.pricing_mode === 'per_item' ? 'součet položek' : 'paušál'}</span>
          <span className={`font-display text-2xl font-bold tabular-nums ${storno ? 'line-through' : ''}`}>{fmtMoney(o.price_total)}</span>
        </div>
        {!storno && <PaidSwitch paid={!!o.paid} onChange={(v) => onPaid(o.id, v)} />}
      </section>

      <section className={`${cardCls} space-y-3 p-4`}>
        <h3 className="font-display text-lg font-bold">Stav zakázky</h3>
        {storno ? (
          <>
            <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 dark:bg-rose-950/50 dark:text-rose-200">Zakázka je stornovaná, je v archivu a nezapočítává se do statistik.</p>
            <button type="button" className={`${btnGhost} w-full`} onClick={() => onStatus(o.id, 'Přijato')}><Icon name="reset" size={18} />Obnovit zakázku (Přijato)</button>
          </>
        ) : (
          <>
            <StatusControl value={o.status} method={o.delivery_method} onChange={(s) => onStatus(o.id, s)} />
            <p className="text-xs text-stone-500 dark:text-stone-400">{finalFor(o.delivery_method)} přesune zakázku do archivu. Změnou zpět na Přijato nebo Hotovo ji vrátíte mezi aktivní.</p>
            {!confirmCancel ? (
              <button type="button" className={`${btnDanger} w-full`} onClick={() => setConfirmCancel(true)}><Icon name="ban" size={18} />Stornovat zakázku</button>
            ) : (
              <div className="space-y-2 rounded-xl border border-red-300 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/40">
                <p className="text-sm font-semibold text-red-800 dark:text-red-200">Zákazník si to rozmyslel? Zakázka půjde do archivu a nezapočítá se do statistik.</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" className="h-12 rounded-xl bg-red-600 text-base font-semibold text-white dark:bg-red-500 dark:text-red-950" onClick={() => { onStatus(o.id, 'Stornováno'); setConfirmCancel(false); }}>Ano, stornovat</button>
                  <button type="button" className={btnGhost} onClick={() => setConfirmCancel(false)}>Ne</button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

