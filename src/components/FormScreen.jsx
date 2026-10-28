import { blankItem } from '../lib/data';
import { FINAL, finalFor, fmtMoney, parseNum, parseQty } from '../lib/utils';
import { Icon } from './Icon';
import { Field, PaidSwitch, Segmented, btnGhost, btnPrimary, cardCls, inputCls } from './ui';
import { useState } from 'react';

export function FormScreen({ draft, setDraft, types, onSave, onCancel, onDelete }) {
  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const setMethod = (m) => setDraft((d) => ({ ...d, delivery_method: m, status: FINAL.includes(d.status) ? finalFor(m) : d.status }));
  const setItem = (id, patch) => setDraft((d) => ({ ...d, items: d.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) }));
  const addItem = () => setDraft((d) => ({ ...d, items: [...d.items, blankItem(types)] }));
  const removeItem = (id) => setDraft((d) => ({ ...d, items: d.items.filter((it) => it.id !== id) }));
  const perItem = draft.pricing_mode === 'per_item';
  const pickup = draft.delivery_method === 'pickup';
  const itemsTotal = draft.items.reduce((s, it) => s + parseQty(it.quantity) * parseNum(it.unit_price), 0);
  const activeTypes = types.filter((t) => t.is_active);

  const handleSave = () => {
    const e = {};
    if (!draft.customer_name.trim()) e.name = 'Zadejte jméno zákazníka.';
    if (draft.items.some((i) => !i.product_type_id)) e.items = 'U každé položky vyberte typ výrobku. Nové typy přidáte v Nastavení.';
    setErrors(e);
    if (Object.keys(e).length === 0) onSave();
  };

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <section className={`${cardCls} space-y-4 p-4`}>
        <h2 className="font-display text-lg font-bold">Zákazník a termíny</h2>
        <Field label="Jméno a příjmení" htmlFor="f-name" error={errors.name}>
          <input id="f-name" className={inputCls} value={draft.customer_name} onChange={(e) => set('customer_name', e.target.value)} placeholder="např. Marie Babičková" autoComplete="off" />
        </Field>
        <Field label="Kontakt" htmlFor="f-contact">
          <input id="f-contact" className={inputCls} value={draft.customer_contact} onChange={(e) => set('customer_contact', e.target.value)} placeholder="Telefon nebo e-mail" autoComplete="off" />
        </Field>
        <div className="space-y-1.5">
          <span className="block text-sm font-semibold text-stone-700 dark:text-stone-300">Předání</span>
          <Segmented label="Způsob předání" value={draft.delivery_method} onChange={setMethod} options={[{ value: 'shipping', label: 'Odeslání' }, { value: 'pickup', label: 'Osobní odběr' }]} />
        </div>
        {!pickup && (
          <Field label="Adresa pro doručení" htmlFor="f-address">
            <input id="f-address" className={inputCls} value={draft.delivery_address} onChange={(e) => set('delivery_address', e.target.value)} placeholder="Ulice, město, PSČ" autoComplete="off" />
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Datum vytvoření" htmlFor="f-created">
            <input id="f-created" type="date" className={inputCls} value={draft.created_at} onChange={(e) => set('created_at', e.target.value)} />
          </Field>
          <Field label="Termín (volitelné)" htmlFor="f-deadline">
            <div className="flex gap-2">
              <input id="f-deadline" type="date" className={inputCls} value={draft.deadline} onChange={(e) => set('deadline', e.target.value)} />
              {draft.deadline && <button type="button" aria-label="Smazat termín" className={`${btnGhost} w-12 shrink-0 px-0`} onClick={() => set('deadline', '')}><Icon name="x" /></button>}
            </div>
          </Field>
        </div>
        <Field label="Stav" htmlFor="f-status">
          <select id="f-status" className={inputCls} value={draft.status} onChange={(e) => set('status', e.target.value)}>
            <option value="Přijato">Přijato</option>
            <option value="Hotovo">Hotovo</option>
            <option value={finalFor(draft.delivery_method)}>{finalFor(draft.delivery_method)} (do archivu)</option>
            <option value="Stornováno">Stornováno (do archivu, mimo statistiky)</option>
          </select>
        </Field>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">Výrobky</h2>
        {draft.items.map((it, idx) => {
          const typeList = types.filter((t) => t.is_active || t.id === Number(it.product_type_id));
          return (
            <div key={it.id} className={`${cardCls} space-y-3 p-4`}>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold">Položka #{idx + 1}</h3>
                <button type="button" aria-label={`Odebrat položku ${idx + 1}`} disabled={draft.items.length === 1} onClick={() => removeItem(it.id)}
                  className="-mr-2 flex h-11 w-11 items-center justify-center rounded-xl text-stone-500 transition active:scale-95 disabled:opacity-30 dark:text-stone-400"><Icon name="x" /></button>
              </div>
              <Field label="Typ výrobku" htmlFor={`t-${it.id}`}>
                <select id={`t-${it.id}`} className={inputCls} value={String(it.product_type_id)} onChange={(e) => setItem(it.id, { product_type_id: Number(e.target.value) })}>
                  {!it.product_type_id && <option value="">Vyberte typ…</option>}
                  {typeList.map((t) => <option key={t.id} value={t.id}>{t.name}{t.is_active ? '' : ' (skrytý)'}</option>)}
                </select>
              </Field>
              <Field label="Nápis / specifikace" htmlFor={`i-${it.id}`}>
                <input id={`i-${it.id}`} className={inputCls} value={it.inscription} onChange={(e) => setItem(it.id, { inscription: e.target.value })} placeholder="např. babičce k 70. narozeninám" autoComplete="off" />
              </Field>
              <div className={`grid gap-3 ${perItem ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <Field label="Počet kusů" htmlFor={`q-${it.id}`}>
                  <div className="flex">
                    <button type="button" aria-label="Ubrat kus" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-l-xl border border-r-0 border-stone-300 bg-stone-50 active:bg-stone-100 dark:border-stone-700 dark:bg-stone-800" onClick={() => setItem(it.id, { quantity: String(Math.max(1, parseQty(it.quantity) - 1)) })}><Icon name="minus" size={18} /></button>
                    <input id={`q-${it.id}`} inputMode="numeric" className={`${inputCls} rounded-none text-center tabular-nums`} value={it.quantity} onChange={(e) => setItem(it.id, { quantity: e.target.value.replace(/\D/g, '') })} onBlur={() => setItem(it.id, { quantity: String(parseQty(it.quantity)) })} />
                    <button type="button" aria-label="Přidat kus" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-r-xl border border-l-0 border-stone-300 bg-stone-50 active:bg-stone-100 dark:border-stone-700 dark:bg-stone-800" onClick={() => setItem(it.id, { quantity: String(parseQty(it.quantity) + 1) })}><Icon name="plus" size={18} /></button>
                  </div>
                </Field>
                {perItem && (
                  <Field label="Cena za kus (Kč)" htmlFor={`p-${it.id}`}>
                    <input id={`p-${it.id}`} inputMode="decimal" className={`${inputCls} tabular-nums`} value={it.unit_price} onChange={(e) => setItem(it.id, { unit_price: e.target.value })} placeholder="0" />
                  </Field>
                )}
              </div>
              {perItem && <p className="text-right text-sm tabular-nums text-stone-500 dark:text-stone-400">Mezisoučet {fmtMoney(parseQty(it.quantity) * parseNum(it.unit_price))}</p>}
            </div>
          );
        })}
        {errors.items && <p className="text-sm font-medium text-red-600 dark:text-red-400">{errors.items}</p>}
        {activeTypes.length === 0 && <p className="text-sm text-stone-600 dark:text-stone-400">Žádný typ výrobku není aktivní. Přidejte ho v Nastavení.</p>}
        <button type="button" onClick={addItem} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-300 text-base font-semibold text-stone-700 transition active:scale-[.99] dark:border-stone-700 dark:text-stone-300">
          <Icon name="plus" size={20} />Přidat další výrobek
        </button>
      </section>

      <section className={`${cardCls} space-y-4 p-4`}>
        <h2 className="font-display text-lg font-bold">Platba</h2>
        <Segmented label="Způsob ceny" value={draft.pricing_mode} onChange={(v) => set('pricing_mode', v)} options={[{ value: 'per_item', label: 'Položkově' }, { value: 'total_manual', label: 'Paušál' }]} />
        {perItem ? (
          <div className="flex items-baseline justify-between gap-3 rounded-xl bg-stone-100 px-4 py-3 dark:bg-stone-800/70">
            <span className="text-sm font-semibold text-stone-600 dark:text-stone-300">Cena celkem (součet položek)</span>
            <span className="font-display text-2xl font-bold tabular-nums">{fmtMoney(itemsTotal)}</span>
          </div>
        ) : (
          <Field label="Cena celkem (Kč)" htmlFor="f-total" hint="Zadejte pevnou částku za celou zakázku. Ceny položek se skryjí.">
            <input id="f-total" inputMode="decimal" className={`${inputCls} tabular-nums`} value={draft.price_manual} onChange={(e) => set('price_manual', e.target.value)} placeholder="např. 1500" />
          </Field>
        )}
        <PaidSwitch paid={!!draft.paid} onChange={(v) => set('paid', v)} />
      </section>

      {Object.keys(errors).length > 0 && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">Zakázku zatím nelze uložit: {Object.values(errors).join(' ')}</p>}

      <div className="flex flex-col gap-3">
        <button type="button" className={`${btnPrimary} w-full`} onClick={handleSave}><Icon name="check" size={20} />{draft.id ? 'Uložit změny' : 'Uložit zakázku'}</button>
        <button type="button" className={`${btnGhost} w-full`} onClick={onCancel}>{draft.id ? 'Zahodit změny' : 'Zahodit a zpět na přehled'}</button>
        {draft.id && !confirmDelete && (
          <button type="button" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-base font-semibold text-red-600 dark:text-red-400" onClick={() => setConfirmDelete(true)}><Icon name="trash" size={18} />Smazat zakázku</button>
        )}
        {draft.id && confirmDelete && (
          <div className="space-y-2 rounded-xl border border-red-300 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/40">
            <p className="text-sm font-semibold text-red-800 dark:text-red-200">Zakázku {draft.id} nenávratně smažete. Pokud si ji zákazník jen rozmyslel, použijte raději stornování.</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="h-12 rounded-xl bg-red-600 text-base font-semibold text-white dark:bg-red-500 dark:text-red-950" onClick={onDelete}>Ano, smazat</button>
              <button type="button" className={btnGhost} onClick={() => setConfirmDelete(false)}>Ne</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

