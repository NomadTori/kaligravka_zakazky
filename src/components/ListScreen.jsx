import { czCount, czDays, daysUntil, fieldHit, fmtDate, fmtMoney, fmtShort, isActiveOrder, matches, tokens, typeNameOf } from '../lib/utils';
import { Icon } from './Icon';
import { CopyCarrierButton, Highlight, PaidBadge, PaidToggle, STATUS_STYLE, StatusBadge, StatusControl, btnGhost, btnPrimary, cardCls, inputCls } from './ui';
import { useMemo, useState } from 'react';

export function DeadlineChip({ order }) {
  if (!order.deadline) return <span className="text-sm text-stone-400 dark:text-stone-500">Bez termínu</span>;
  if (!isActiveOrder(order)) return <span className="inline-flex items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400"><Icon name="calendar" size={16} />{fmtDate(order.deadline)}</span>;
  const d = daysUntil(order.deadline);
  if (d <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-sm font-bold text-white dark:bg-red-500 dark:text-red-950">
        <Icon name="alert" size={16} />{d === 0 ? 'Dnes' : `Po termínu ${-d} ${czDays(-d)}`}
      </span>
    );
  }
  if (d <= 3) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-2.5 py-1 text-sm font-bold text-orange-800 dark:bg-orange-950 dark:text-orange-200">
        <Icon name="calendar" size={16} />{d === 1 ? 'Zítra' : `Za ${d} ${czDays(d)}`}
      </span>
    );
  }
  return <span className="inline-flex items-center gap-1.5 text-sm text-stone-600 dark:text-stone-300"><Icon name="calendar" size={16} />do {fmtShort(order.deadline)}</span>;
}

export function frameFor(o) {
  const d = isActiveOrder(o) && o.deadline ? daysUntil(o.deadline) : null;
  if (d !== null && d <= 0) return 'border-2 border-red-500 bg-red-50 dark:border-red-500 dark:bg-red-950/40';
  if (d !== null && d <= 3) return 'border-2 border-orange-400 bg-white dark:border-orange-500 dark:bg-stone-900';
  return 'border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900';
}


export function OrderCard({ order: o, types, query, archive, onOpen, onStatus, onCopy, onPaid }) {
  const storno = o.status === 'Stornováno';
  return (
    <article className={`flex flex-col gap-3 rounded-2xl p-4 ${frameFor(o)} ${storno ? 'opacity-80' : ''}`}>
      <button type="button" onClick={() => onOpen(o)} className="-m-1 flex min-h-[44px] w-[calc(100%+0.5rem)] flex-col gap-2 rounded-xl p-1 text-left" aria-label={`Otevřít detail zakázky ${o.id}, ${o.customer_name}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-bold leading-tight text-stone-900 dark:text-stone-50"><Highlight text={o.customer_name} query={query} /></h3>
            <p className="mt-0.5 text-sm tabular-nums text-stone-500 dark:text-stone-400">{o.id} · přijato {fmtDate(o.created_at)}</p>
          </div>
          <div className="shrink-0"><DeadlineChip order={o} /></div>
        </div>
        {o.customer_contact && (
          <p className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-300"><Icon name="phone" size={15} className="shrink-0" /><span className="min-w-0 truncate"><Highlight text={o.customer_contact} query={query} /></span></p>
        )}
        {o.delivery_method === 'pickup' && (
          <p className="flex items-center gap-2 text-sm font-medium text-stone-600 dark:text-stone-300"><Icon name="bag" size={15} className="shrink-0" />Osobní odběr</p>
        )}
        {o.delivery_method !== 'pickup' && fieldHit(o.delivery_address, query) && (
          <p className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-300"><Icon name="pin" size={15} className="shrink-0" /><span className="min-w-0"><Highlight text={o.delivery_address} query={query} /></span></p>
        )}
        <ul className="space-y-1">
          {o.items.map((i) => (
            <li key={i.id} className="text-[15px] leading-snug text-stone-800 dark:text-stone-200">
              <span className="font-semibold tabular-nums">{i.quantity}× {typeNameOf(types, i.product_type_id)}</span>
              {i.inscription && <span className="text-stone-600 dark:text-stone-400"> – „<Highlight text={i.inscription} query={query} />“</span>}
            </li>
          ))}
        </ul>
      </button>
      <div className="flex items-center justify-between gap-3">
        <span className={`font-display text-xl font-bold tabular-nums text-stone-900 dark:text-stone-50 ${storno ? 'line-through decoration-2' : ''}`}>{fmtMoney(o.price_total)}</span>
        {archive ? <StatusBadge status={o.status} /> : o.pricing_mode === 'total_manual' && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">paušál</span>}
      </div>
      {!storno && (
        <div className="flex flex-wrap items-center gap-2">
          <PaidToggle paid={!!o.paid} onToggle={() => onPaid(o.id, !o.paid)} />
          {o.delivery_method !== 'pickup' && <CopyCarrierButton onClick={() => onCopy(o)} />}
        </div>
      )}
      {!archive && <StatusControl value={o.status} method={o.delivery_method} onChange={(s) => onStatus(o.id, s)} />}
    </article>
  );
}

export function OrderRow({ order: o, types, query, onOpen }) {
  const storno = o.status === 'Stornováno';
  const summary = o.items.map((i) => `${i.quantity}× ${typeNameOf(types, i.product_type_id)}`).join(', ');
  const inscriptions = o.items.filter((i) => i.inscription).map((i) => `„${i.inscription}“`).join(' · ');
  return (
    <button type="button" onClick={() => onOpen(o)} aria-label={`Otevřít detail zakázky ${o.id}, ${o.customer_name}`}
      className={`flex min-h-[64px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition active:scale-[.99] ${frameFor(o)} ${storno ? 'opacity-80' : ''}`}>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate font-display text-base font-bold text-stone-900 dark:text-stone-50"><Highlight text={o.customer_name} query={query} /></p>
        <p className="truncate text-sm text-stone-700 dark:text-stone-300">{summary}</p>
        {inscriptions && <p className="truncate text-sm text-stone-500 dark:text-stone-400"><Highlight text={inscriptions} query={query} /></p>}
        {fieldHit(o.customer_contact, query) && <p className="truncate text-sm text-stone-500 dark:text-stone-400"><Highlight text={o.customer_contact} query={query} /></p>}
        {o.delivery_method !== 'pickup' && fieldHit(o.delivery_address, query) && <p className="truncate text-sm text-stone-500 dark:text-stone-400"><Highlight text={o.delivery_address} query={query} /></p>}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5">
          <DeadlineChip order={o} />
          <StatusBadge status={o.status} />
          {!storno && <PaidBadge paid={!!o.paid} />}
          {o.delivery_method === 'pickup' && <span className="inline-flex items-center gap-1 text-xs font-medium text-stone-500 dark:text-stone-400"><Icon name="bag" size={13} />odběr</span>}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className={`font-display text-base font-bold tabular-nums ${storno ? 'line-through' : ''}`}>{fmtMoney(o.price_total)}</p>
        <p className="text-xs tabular-nums text-stone-500 dark:text-stone-400">{o.id}</p>
      </div>
    </button>
  );
}

/* "Co vyrobit": součet kusů podle typů ze všech neodeslaných (aktivních) zakázek */
export function MakeSummary({ orders, types }) {
  const [open, setOpen] = useState(false);
  const [onlyTodo, setOnlyTodo] = useState(false); // jen dosud nevyrobené = bez stavu Hotovo
  const { rows, total, count } = useMemo(() => {
    const src = orders.filter((o) => o.status === 'Přijato' || (!onlyTodo && o.status === 'Hotovo'));
    const m = new Map();
    src.forEach((o) => o.items.forEach((i) => m.set(i.product_type_id, (m.get(i.product_type_id) || 0) + i.quantity)));
    const r = [...m.entries()].map(([id, qty]) => ({ id, qty, name: typeNameOf(types, id) })).sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name, 'cs'));
    return { rows: r, total: r.reduce((s, x) => s + x.qty, 0), count: src.length };
  }, [orders, types, onlyTodo]);
  return (
    <div className={cardCls}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl px-4 text-left">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200"><Icon name="package" size={20} /></span>
        <span className="flex-1 font-display text-base font-bold">Co vyrobit</span>
        <span className="rounded-full bg-stone-900 px-2.5 py-0.5 text-xs font-bold tabular-nums text-white dark:bg-stone-100 dark:text-stone-900">{total} ks</span>
        <Icon name={open ? 'up' : 'down'} className="text-stone-500 dark:text-stone-400" />
      </button>
      {open && (
        <div className="space-y-3 border-t border-stone-200 px-4 pb-4 pt-3 dark:border-stone-800">
          {rows.length === 0 ? (
            <p className="text-sm text-stone-600 dark:text-stone-400">Nic k výrobě. Všechny aktivní zakázky jsou hotové.</p>
          ) : (
            <>
              <p className="text-[15px] font-semibold leading-snug">K výrobě celkem: {rows.map((r) => `${r.qty}× ${r.name}`).join(', ')}</p>
              <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                {rows.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="text-base">{r.name}</span>
                    <span className="font-display text-xl font-bold tabular-nums">{r.qty} ks</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-stone-500 dark:text-stone-400">Celkem {total} ks ze {count} {czCount(count, 'zakázky', 'zakázek', 'zakázek')}.</p>
            </>
          )}
          <button type="button" role="switch" aria-checked={onlyTodo} onClick={() => setOnlyTodo((v) => !v)} className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl text-left">
            <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Jen dosud nevyrobené (bez stavu Hotovo)</span>
            <span className={`flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition ${onlyTodo ? 'bg-stone-900 dark:bg-stone-100' : 'bg-stone-300 dark:bg-stone-700'}`}>
              <span className={`h-6 w-6 rounded-full bg-white shadow transition-transform dark:bg-stone-900 ${onlyTodo ? 'translate-x-5' : ''}`} />
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

export function ListScreen({ kind, orders, types, query, prefs, setPrefs, onOpen, onStatus, onNew, onJump, statusFilter, setStatusFilter, onCopy, onPaid }) {
  const archive = kind === 'archive';
  const view = archive ? prefs.viewArchive : prefs.viewActive;
  const sort = archive ? prefs.sortArchive : prefs.sortActive;
  const setView = (v) => setPrefs((p) => ({ ...p, [archive ? 'viewArchive' : 'viewActive']: v }));
  const setSort = (v) => setPrefs((p) => ({ ...p, [archive ? 'sortArchive' : 'sortActive']: v }));
  const searching = tokens(query).length > 0;

  const list = useMemo(() => {
    const l = orders.filter((o) => (archive ? !isActiveOrder(o) : isActiveOrder(o) && (statusFilter === 'all' || o.status === statusFilter)) && matches(o, query));
    const byCreated = (a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id);
    if (sort === 'oldest') l.sort(byCreated);
    else if (sort === 'newest') l.sort((a, b) => byCreated(b, a));
    else l.sort((a, b) => (a.deadline || '9999-12-31').localeCompare(b.deadline || '9999-12-31') || byCreated(b, a));
    return l;
  }, [orders, query, archive, sort, statusFilter]);
  const counts = useMemo(() => {
    const base = orders.filter((o) => isActiveOrder(o) && matches(o, query));
    return { all: base.length, 'Přijato': base.filter((o) => o.status === 'Přijato').length, 'Hotovo': base.filter((o) => o.status === 'Hotovo').length };
  }, [orders, query]);
  const otherCount = useMemo(() => orders.filter((o) => (archive ? isActiveOrder(o) : !isActiveOrder(o)) && matches(o, query)).length, [orders, query, archive]);

  return (
    <div className="space-y-4">
      {!archive && (
        <>
          <div role="group" aria-label="Filtr stavu" className="grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1 dark:bg-stone-800/70">
            {[['all', 'Všechny'], ['Přijato', 'Přijato'], ['Hotovo', 'Hotovo']].map(([v, l]) => (
              <button key={v} type="button" aria-pressed={statusFilter === v} onClick={() => setStatusFilter(v)}
                className={`flex h-11 items-center justify-center gap-1.5 rounded-lg px-1 text-sm font-semibold transition ${statusFilter === v ? (v === 'all' ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-700 dark:text-white' : STATUS_STYLE[v]) : 'text-stone-600 dark:text-stone-300'}`}>
                {l}<span className="text-xs font-bold tabular-nums opacity-70">{counts[v]}</span>
              </button>
            ))}
          </div>
          <MakeSummary orders={orders} types={types} />
        </>
      )}
      <div className="flex items-center gap-2">
        <select aria-label="Řazení" className={`${inputCls} flex-1`} value={sort} onChange={(e) => setSort(e.target.value)}>
          {!archive && <option value="deadline">Podle termínu</option>}
          {archive ? <option value="newest">Nejnovější nahoře</option> : <option value="newest">Nejnovější nahoře</option>}
          <option value="oldest">Nejstarší nahoře</option>
        </select>
        <div role="group" aria-label="Zobrazení" className="flex shrink-0 rounded-xl bg-stone-100 p-1 dark:bg-stone-800/70">
          {[['tiles', 'grid', 'Dlaždice'], ['list', 'rows', 'Seznam']].map(([v, ic, lab]) => (
            <button key={v} type="button" aria-label={lab} aria-pressed={view === v} onClick={() => setView(v)}
              className={`flex h-11 w-11 items-center justify-center rounded-lg transition ${view === v ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-700 dark:text-white' : 'text-stone-500 dark:text-stone-400'}`}><Icon name={ic} /></button>
          ))}
        </div>
      </div>

      <p className="text-sm text-stone-600 dark:text-stone-400">
        {searching ? `Hledání „${query.trim()}“ · ` : ''}{list.length} {archive ? czCount(list.length, 'zakázka v archivu', 'zakázky v archivu', 'zakázek v archivu') : czCount(list.length, 'aktivní zakázka', 'aktivní zakázky', 'aktivních zakázek')}
      </p>

      {searching && otherCount > 0 && (
        <div className={`${cardCls} flex items-center justify-between gap-3 p-3`}>
          <p className="text-sm text-stone-700 dark:text-stone-300">{archive ? 'V aktivních' : 'V archivu'} je dalších {otherCount} {czCount(otherCount, 'výsledek', 'výsledky', 'výsledků')}.</p>
          <button type="button" className={`${btnGhost} h-11 shrink-0 px-3 text-sm`} onClick={onJump}>Zobrazit</button>
        </div>
      )}

      {list.length > 0 ? (
        view === 'tiles' ? (
          <div className="grid gap-3 md:grid-cols-2">{list.map((o) => <OrderCard key={o.id} order={o} types={types} query={query} archive={archive} onOpen={onOpen} onStatus={onStatus} onCopy={onCopy} onPaid={onPaid} />)}</div>
        ) : (
          <div className="space-y-2">{list.map((o) => <OrderRow key={o.id} order={o} types={types} query={query} onOpen={onOpen} />)}</div>
        )
      ) : (
        <div className={`${cardCls} flex flex-col items-center gap-3 px-6 py-10 text-center`}>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"><Icon name={searching ? 'search' : archive ? 'archive' : 'list'} size={24} /></div>
          <p className="font-display text-lg font-bold">{searching ? 'Nic nenalezeno' : archive ? 'Archiv je prázdný' : statusFilter !== 'all' ? `Žádné zakázky ve stavu ${statusFilter}` : 'Žádné aktivní zakázky'}</p>
          <p className="max-w-xs text-sm text-stone-600 dark:text-stone-400">
            {searching ? 'Zkuste kratší část slova, například jen začátek jména nebo motivu.' : archive ? 'Odeslané, odevzdané a stornované zakázky se ukládají sem.' : statusFilter !== 'all' ? 'V tomto filtru nic není. Přepněte na Všechny.' : 'Nová zakázka se objeví tady, dokud ji neodešlete, neodevzdáte nebo nestornujete.'}
          </p>
          {!searching && !archive && statusFilter === 'all' && <button type="button" className={btnPrimary} onClick={onNew}><Icon name="plus" size={20} />Nová zakázka</button>}
        </div>
      )}
    </div>
  );
}

