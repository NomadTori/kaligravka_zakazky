import { CHART_COLORS, MONTHS, cap, fmtAxis, fmtDate, fmtMoney, isSent, pad, parseISO, toISO, todayISO, typeNameOf } from '../lib/utils';
import { Icon } from './Icon';
import { Field, Segmented, cardCls, inputCls } from './ui';
import { useMemo, useState } from 'react';

export function Donut({ slices, selected, onSelect, total, metric }) {
  const R = 15.9155;
  const sel = slices.find((s) => s.id === selected);
  let acc = 0;
  return (
    <svg viewBox="0 0 42 42" className="mx-auto h-60 w-60 max-w-full" role="img" aria-label="Koláčový graf podílu výrobků">
      <g transform="rotate(-90 21 21)">
        <circle cx="21" cy="21" r={R} fill="none" stroke="currentColor" strokeWidth="5" className="text-stone-100 dark:text-stone-800" />
        {slices.map((s) => {
          const dash = slices.length > 1 ? Math.max(s.pct - 0.7, 0.1) : 100;
          const el = (
            <circle key={s.id} cx="21" cy="21" r={R} fill="none" stroke={s.color} strokeWidth={selected === s.id ? 6.6 : 5}
              strokeDasharray={`${dash} ${100 - dash}`} strokeDashoffset={-acc}
              opacity={selected !== null && selected !== s.id ? 0.4 : 1} style={{ cursor: 'pointer', transition: 'opacity .2s, stroke-width .2s' }}
              onClick={() => onSelect(selected === s.id ? null : s.id)} />
          );
          acc += s.pct;
          return el;
        })}
      </g>
      {sel ? (
        <>
          <text x="21" y="17.4" textAnchor="middle" fontSize="2.8" className="fill-stone-500 dark:fill-stone-400">{sel.name.length > 14 ? sel.name.slice(0, 13) + '…' : sel.name}</text>
          <text x="21" y="23.6" textAnchor="middle" fontSize="6" fontWeight="700" className="fill-stone-900 font-display dark:fill-stone-50">{Math.round(sel.pct)} %</text>
          <text x="21" y="27.8" textAnchor="middle" fontSize="2.6" className="fill-stone-500 dark:fill-stone-400">{metric === 'qty' ? `${sel.qty} ks` : fmtMoney(sel.rev)}</text>
        </>
      ) : (
        <>
          <text x="21" y="19" textAnchor="middle" fontSize="2.8" className="fill-stone-500 dark:fill-stone-400">{metric === 'qty' ? 'Celkem kusů' : 'Celkem tržba'}</text>
          <text x="21" y="25" textAnchor="middle" fontSize="4.6" fontWeight="700" className="fill-stone-900 font-display dark:fill-stone-50">{metric === 'qty' ? total : fmtMoney(total)}</text>
        </>
      )}
    </svg>
  );
}

export function niceMax(v) {
  if (v <= 0) return 1000;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}

/* Sloupce obratu po měsících (nebo po letech, když je období delší než 24 měsíců) */
export function buildBuckets(list, startISO, endISO) {
  const s = parseISO(startISO), e = parseISO(endISO);
  const months = (e.getFullYear() - s.getFullYear()) * 12 + e.getMonth() - s.getMonth() + 1;
  if (months < 2 || months > 1200) return { items: [], yearly: false };
  const yearly = months > 24;
  const map = new Map();
  list.forEach((o) => { const k = yearly ? o.created_at.slice(0, 4) : o.created_at.slice(0, 7); map.set(k, (map.get(k) || 0) + o.price_total); });
  const items = [];
  if (yearly) {
    for (let y = s.getFullYear(); y <= e.getFullYear(); y++) items.push({ key: String(y), label: String(y), title: `Rok ${y}`, value: map.get(String(y)) || 0 });
  } else {
    for (let i = 0; i < months; i++) {
      const d = new Date(s.getFullYear(), s.getMonth() + i, 1);
      const k = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      items.push({ key: k, label: d.toLocaleDateString('cs-CZ', { month: 'short' }) + (months > 12 ? ` ${String(d.getFullYear()).slice(2)}` : ''), title: cap(d.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })), value: map.get(k) || 0 });
    }
  }
  return { items, yearly };
}

export function BarChart({ data, selected, onSelect }) {
  const n = data.length;
  const max = Math.max(...data.map((d) => d.value), 0);
  const top = niceMax(max);
  const ticks = [0, 1, 2, 3, 4].map((i) => (top * i) / 4);
  const left = 54, right = 8, pt = 16, pb = 28, H = 200;
  const W = Math.max(340, left + right + n * 36);
  const slot = (W - left - right) / n;
  const bw = Math.min(slot * 0.62, 34);
  const ph = H - pt - pb;
  const y = (v) => pt + ph - (v / top) * ph;
  const scroll = W > 340;
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: scroll ? W : '100%', minWidth: scroll ? W : undefined }} role="img" aria-label="Sloupcový graf obratu">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={left} x2={W - right} y1={y(t)} y2={y(t)} stroke="currentColor" strokeWidth="0.5" className="text-stone-300 dark:text-stone-700" />
            <text x={left - 6} y={y(t) + 3} textAnchor="end" fontSize="9" className="fill-stone-500 dark:fill-stone-400">{fmtAxis(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = left + i * slot + (slot - bw) / 2;
          const h = (d.value / top) * ph;
          const dim = selected !== null && selected !== d.key;
          return (
            <g key={d.key} style={{ cursor: 'pointer' }} onClick={() => onSelect(selected === d.key ? null : d.key)}>
              <rect x={left + i * slot} y={pt} width={slot} height={ph} fill="transparent" />
              {d.value > 0 && <rect x={x} y={y(d.value)} width={bw} height={h} rx="3" fill="#2563eb" opacity={dim ? 0.4 : 1} />}
              {n <= 8 && d.value > 0 && <text x={x + bw / 2} y={y(d.value) - 4} textAnchor="middle" fontSize="8" className="fill-stone-700 dark:fill-stone-300">{fmtAxis(d.value)}</text>}
              <text x={left + i * slot + slot / 2} y={H - 10} textAnchor="middle" fontSize="9" fontWeight={selected === d.key ? '700' : '400'} className="fill-stone-600 dark:fill-stone-300">{d.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function StatsScreen({ orders, types }) {
  const now = new Date();
  const [mode, setMode] = useState('month');
  const [cur, setCur] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [from, setFrom] = useState(() => `${now.getFullYear()}-01-01`);
  const [to, setTo] = useState(todayISO);
  const [metric, setMetric] = useState('qty');
  const [sel, setSel] = useState(null);
  const [selBar, setSelBar] = useState(null);

  const years = useMemo(() => {
    const ys = orders.map((o) => Number(o.created_at.slice(0, 4)));
    const lo = Math.min(now.getFullYear(), ...ys), hi = Math.max(now.getFullYear(), ...ys);
    const list = [];
    for (let y = hi; y >= lo; y--) list.push(y);
    if (!list.includes(cur.y)) { list.push(cur.y); list.sort((a, b) => b - a); }
    return list;
  }, [orders, cur.y]);

  const step = (dir) => setCur((c) => {
    if (mode === 'year') return { ...c, y: c.y + dir };
    const t = new Date(c.y, c.m + dir, 1);
    return { y: t.getFullYear(), m: t.getMonth() };
  });

  const [rFrom, rTo] = useMemo(() => {
    if (mode === 'month') return [toISO(new Date(cur.y, cur.m, 1)), toISO(new Date(cur.y, cur.m + 1, 0))];
    if (mode === 'year') return [`${cur.y}-01-01`, `${cur.y}-12-31`];
    if (mode === 'custom') return [from, to];
    return ['0000-01-01', '9999-12-31'];
  }, [mode, cur, from, to]);
  const periodLabel = mode === 'month' ? `${MONTHS[cur.m]} ${cur.y}` : mode === 'year' ? `Rok ${cur.y}` : mode === 'custom' ? `${fmtDate(from)} – ${fmtDate(to)}` : 'Všechna data';

  // Do statistik jdou jen odeslané a odevzdané zakázky (archiv bez stornovaných)
  const inPeriod = useMemo(() => orders.filter((o) => isSent(o) && o.created_at >= rFrom && o.created_at <= rTo), [orders, rFrom, rTo]);
  const cancelled = useMemo(() => orders.filter((o) => o.status === 'Stornováno' && o.created_at >= rFrom && o.created_at <= rTo).length, [orders, rFrom, rTo]);
  const revenue = inPeriod.reduce((s, o) => s + o.price_total, 0);
  const count = inPeriod.length;
  const avg = count ? revenue / count : 0;
  const buckets = useMemo(() => {
    let cs = null, ce = null;
    if (mode === 'year') { cs = `${cur.y}-01-01`; ce = `${cur.y}-12-31`; }
    else if (mode === 'custom' && from <= to) { cs = from; ce = to; }
    else if (mode === 'all' && inPeriod.length) { const ds = inPeriod.map((o) => o.created_at).sort(); cs = ds[0]; ce = ds[ds.length - 1]; }
    return cs ? buildBuckets(inPeriod, cs, ce) : { items: [], yearly: false };
  }, [mode, cur.y, from, to, inPeriod]);
  const bar = buckets.items.find((b) => b.key === selBar) || null;

  const { rows, totalQty, totalRev } = useMemo(() => {
    const m = new Map();
    inPeriod.forEach((o) => {
      const q = o.items.reduce((s, i) => s + i.quantity, 0) || 1;
      o.items.forEach((i) => {
        const rev = o.pricing_mode === 'per_item' ? i.quantity * i.unit_price : (o.price_total * i.quantity) / q; // paušál se dělí podle počtu kusů
        const c = m.get(i.product_type_id) || { qty: 0, rev: 0 };
        c.qty += i.quantity; c.rev += rev; m.set(i.product_type_id, c);
      });
    });
    const arr = [...m.entries()].map(([id, v]) => ({ id, name: typeNameOf(types, id), ...v }));
    arr.sort((a, b) => (metric === 'qty' ? b.qty - a.qty : b.rev - a.rev) || a.name.localeCompare(b.name, 'cs'));
    const tq = arr.reduce((s, r) => s + r.qty, 0); const tr = arr.reduce((s, r) => s + r.rev, 0);
    arr.forEach((r, i) => { r.color = CHART_COLORS[i % CHART_COLORS.length]; r.pct = metric === 'qty' ? (tq ? (r.qty / tq) * 100 : 0) : (tr ? (r.rev / tr) * 100 : 0); r.revShare = tr ? (r.rev / tr) * 100 : 0; });
    return { rows: arr, totalQty: tq, totalRev: tr };
  }, [inPeriod, types, metric]);

  const selected = rows.some((r) => r.id === sel) ? sel : null;
  const stepBtn = 'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-stone-300 bg-white text-stone-800 transition active:scale-95 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100';
  const kpi = (label, value, wide) => (
    <div className={`${cardCls} p-4 ${wide ? 'col-span-2' : ''}`}>
      <p className="text-sm font-semibold text-stone-500 dark:text-stone-400">{label}</p>
      <p className={`mt-1 font-display font-bold tabular-nums ${wide ? 'text-4xl' : 'text-2xl'}`}>{value}</p>
    </div>
  );

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <section className={`${cardCls} space-y-3 p-4`}>
        <span className="block text-sm font-semibold text-stone-700 dark:text-stone-300">Období</span>
        <Segmented label="Typ období" value={mode} onChange={(v) => { setMode(v); setSelBar(null); }} options={[{ value: 'month', label: 'Měsíc' }, { value: 'year', label: 'Rok' }, { value: 'custom', label: 'Vlastní' }, { value: 'all', label: 'Vše' }]} />
        {(mode === 'month' || mode === 'year') && (
          <div className="flex items-center gap-2">
            <button type="button" aria-label={mode === 'month' ? 'Předchozí měsíc' : 'Předchozí rok'} className={stepBtn} onClick={() => step(-1)}><Icon name="back" /></button>
            {mode === 'month' && (
              <select aria-label="Měsíc" className={inputCls} value={cur.m} onChange={(e) => setCur((c) => ({ ...c, m: Number(e.target.value) }))}>
                {MONTHS.map((n, i) => <option key={n} value={i}>{n}</option>)}
              </select>
            )}
            <select aria-label="Rok" className={inputCls} value={cur.y} onChange={(e) => setCur((c) => ({ ...c, y: Number(e.target.value) }))}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button type="button" aria-label={mode === 'month' ? 'Další měsíc' : 'Další rok'} className={stepBtn} onClick={() => step(1)}><Icon name="next" /></button>
          </div>
        )}
        {mode === 'custom' && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Od" htmlFor="s-from"><input id="s-from" type="date" className={inputCls} value={from} onChange={(e) => { setFrom(e.target.value); setSelBar(null); }} /></Field>
            <Field label="Do" htmlFor="s-to"><input id="s-to" type="date" className={inputCls} value={to} onChange={(e) => { setTo(e.target.value); setSelBar(null); }} /></Field>
          </div>
        )}
        <p className="text-sm tabular-nums text-stone-600 dark:text-stone-400">{periodLabel}{mode === 'custom' && from > to ? ' · datum „od“ je po datu „do“' : ''}</p>
      </section>

      <div className="grid grid-cols-2 gap-3">
        {kpi('Celkový obrat', fmtMoney(revenue), true)}
        {kpi('Vyřízené zakázky', count)}
        {kpi('Průměr na zakázku', fmtMoney(avg))}
      </div>
      <p className="-mt-2 text-xs text-stone-500 dark:text-stone-400">
        Počítají se jen odeslané a odevzdané zakázky z archivu, podle data vytvoření.{cancelled > 0 ? ` Stornováno v období: ${cancelled} (nezapočítáno).` : ' Stornované se nezapočítávají.'}
      </p>

      {buckets.items.length > 0 && (
        <section className={`${cardCls} space-y-3 p-4`}>
          <h2 className="font-display text-lg font-bold">{buckets.yearly ? 'Obrat po letech' : 'Obrat po měsících'}</h2>
          <p className="min-h-[20px] text-sm tabular-nums text-stone-600 dark:text-stone-400">
            {bar ? <><span className="font-semibold text-stone-900 dark:text-stone-100">{bar.title}</span> · {fmtMoney(bar.value)}</> : 'Klepněte na sloupec pro přesnou částku.'}
          </p>
          <BarChart data={buckets.items} selected={selBar} onSelect={setSelBar} />
        </section>
      )}

      <section className={`${cardCls} space-y-4 p-4`}>
        <h2 className="font-display text-lg font-bold">Podíl výrobků</h2>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-600 dark:text-stone-400">V tomto období nejsou žádné odeslané ani odevzdané zakázky. Zvolte jiné období.</p>
        ) : (
          <>
            <Segmented label="Zobrazit podle" value={metric} onChange={setMetric} options={[{ value: 'qty', label: 'Podle kusů' }, { value: 'rev', label: 'Podle tržby' }]} />
            <Donut slices={rows} selected={selected} onSelect={setSel} total={metric === 'qty' ? totalQty : totalRev} metric={metric} />
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full min-w-[320px] text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    <th className="px-1 pb-2 font-semibold">Typ</th><th className="px-1 pb-2 text-right font-semibold">Kusů</th><th className="px-1 pb-2 text-right font-semibold">Tržba</th><th className="px-1 pb-2 text-right font-semibold">Podíl</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} tabIndex={0} onClick={() => setSel(selected === r.id ? null : r.id)} onKeyDown={(e) => { if (e.key === 'Enter') setSel(selected === r.id ? null : r.id); }}
                      className={`cursor-pointer border-t border-stone-200 dark:border-stone-800 ${selected === r.id ? 'bg-stone-100 dark:bg-stone-800/70' : ''}`}>
                      <td className="flex min-h-[44px] items-center gap-2 px-1 font-semibold"><span className="h-3 w-3 shrink-0 rounded-full" style={{ background: r.color }} />{r.name}</td>
                      <td className="px-1 text-right tabular-nums">{r.qty}</td>
                      <td className="px-1 text-right tabular-nums">{fmtMoney(r.rev)}</td>
                      <td className="px-1 text-right font-semibold tabular-nums">{Math.round(r.revShare)} %</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-stone-300 font-bold dark:border-stone-700">
                    <td className="px-1 py-3">Celkem</td><td className="px-1 text-right tabular-nums">{totalQty}</td><td className="px-1 text-right tabular-nums">{fmtMoney(totalRev)}</td><td className="px-1 text-right tabular-nums">100 %</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">U paušálních zakázek se cena rozdělí mezi typy podle počtu kusů. Podíl v tabulce je podíl na obratu.</p>
          </>
        )}
      </section>
    </div>
  );
}

