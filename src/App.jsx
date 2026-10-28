import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './components/Icon';
import { inputCls } from './components/ui';
import { ListScreen } from './components/ListScreen';
import { DetailScreen } from './components/DetailScreen';
import { FormScreen } from './components/FormScreen';
import { StatsScreen } from './components/StatsScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { FINAL, isActiveOrder, finalFor, daysUntil, parseNum, parseQty, copyText, carrierText, nowISO, newUuid } from './lib/utils';
import { makeDemoOrders, defaultPrefs, newDraftFor, draftFromOrder, nextId } from './lib/data';
import { saveData } from './lib/vault';
import { useCloud } from './lib/useCloud';


const PREFS_KEY = 'ez.prefs';
const loadPrefs = () => {
  try { return { ...defaultPrefs(), ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') }; } catch (e) { return defaultPrefs(); }
};

// Každá změněná položka dostane nové updated_at, podle toho se při synchronizaci pozná, co je novější.
const stamp = (prev, next) => {
  const before = new Map(prev.map((x) => [x.id, x]));
  const now = nowISO();
  return next.map((x) => (before.get(x.id) === x ? x : { ...x, updated_at: now }));
};

export default function App({ initial, cryptoKey, theme, setTheme, isDark, onLock, onChangePin }) {
  const [orders, setOrdersRaw] = useState(initial.orders); // včetně "náhrobků" smazaných zakázek
  const [types, setTypesRaw] = useState(initial.types);
  const [rev, setRev] = useState(0); // zvýší se při každé lokální změně → spustí uložení a synchronizaci
  const [prefs, setPrefs] = useState(loadPrefs);
  const [screen, setScreen] = useState('orders'); // orders | archive | detail | form | stats | settings
  const [query, setQuery] = useState('');
  const [newDraft, setNewDraft] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [detailFrom, setDetailFrom] = useState('orders');
  const [toast, setToast] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const latest = useRef({ orders, types });
  latest.current = { orders, types };

  const setOrders = useCallback((fn) => {
    setOrdersRaw((prev) => stamp(prev, typeof fn === 'function' ? fn(prev) : fn));
    setRev((r) => r + 1);
  }, []);
  const setTypes = useCallback((fn) => {
    setTypesRaw((prev) => stamp(prev, typeof fn === 'function' ? fn(prev) : fn));
    setRev((r) => r + 1);
  }, []);

  // Nastavení zobrazení (řazení, dlaždice/seznam) není citlivé, stačí obyčejný localStorage
  useEffect(() => {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) { /* ignoruj */ }
  }, [prefs]);

  // Šifrované ukládání: krátce po změně, a hned při odchodu na pozadí. Zápisy jdou za sebou.
  const saveChain = useRef(Promise.resolve());
  const persist = useCallback(() => {
    const snapshot = { v: 1, orders: latest.current.orders, types: latest.current.types };
    saveChain.current = saveChain.current.then(() => saveData(cryptoKey, snapshot)).catch(() => { /* příště */ });
    return saveChain.current;
  }, [cryptoKey]);
  useEffect(() => {
    if (rev === 0) return undefined;
    const t = setTimeout(persist, 400);
    return () => clearTimeout(t);
  }, [rev, persist]);
  useEffect(() => {
    const flush = () => { if (document.visibilityState === 'hidden') persist(); };
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', persist);
    return () => { document.removeEventListener('visibilitychange', flush); window.removeEventListener('pagehide', persist); };
  }, [persist]);
  // Po změně PINu (nový klíč) hned přepsat data novým klíčem
  const firstKey = useRef(cryptoKey);
  useEffect(() => { if (firstKey.current !== cryptoKey) { firstKey.current = cryptoKey; persist(); } }, [cryptoKey, persist]);

  // Data ze serveru. Obchází stamp(), aby se přijatá data nevracela zpět jako "nová změna".
  const applyRemote = useCallback(({ orders: ro, types: rt, renames }) => {
    setOrdersRaw((prev) => {
      let list = prev;
      for (const r of renames || []) {
        list = list.map((o) => (o.uuid === r.uuid && o.id === r.from
          ? { ...o, id: r.to, updated_at: r.updated_at, items: o.items.map((i) => ({ ...i, order_id: r.to })) } : o));
      }
      const byId = new Map(list.map((o) => [o.id, o]));
      for (const o of ro) byId.set(o.id, o);
      return [...byId.values()];
    });
    if (rt && rt.length) {
      setTypesRaw((prev) => {
        const byId = new Map(prev.map((t) => [t.id, t]));
        for (const t of rt) byId.set(t.id, t);
        return [...byId.values()].sort((a, b) => a.id - b.id);
      });
    }
    setRev((r) => r + 1); // jen kvůli uložení; synchronizace dopadne na "nic nového"
  }, []);
  const getLocal = useCallback(() => latest.current, []);
  const cloud = useCloud({ cryptoKey, getLocal, applyRemote, rev });

  const showToast = (msg, undo) => setToast({ msg, undo, key: Date.now() });
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const visible = useMemo(() => orders.filter((o) => !o.deleted_at), [orders]);
  const hasDemo = visible.some((o) => o.id.startsWith('#DEMO-'));

  const setStatus = (id, status) => {
    const o = visible.find((x) => x.id === id);
    if (!o || o.status === status) return;
    const prev = o.status;
    const msg = status === 'Stornováno' ? `${id} stornována, je v archivu`
      : FINAL.includes(status) ? `${id} ${status.toLowerCase()} a přesunuto do archivu`
      : !isActiveOrder(o) ? `${id} je zpět mezi aktivními (${status})` : `${id}: ${status}`;
    setOrders((os) => os.map((x) => (x.id === id ? { ...x, status } : x)));
    showToast(msg, () => setOrders((os) => os.map((x) => (x.id === id ? { ...x, status: prev } : x))));
  };

  const setPaid = (id, paid) => {
    const o = visible.find((x) => x.id === id);
    if (!o || !!o.paid === paid) return;
    setOrders((os) => os.map((x) => (x.id === id ? { ...x, paid } : x)));
    showToast(paid ? `${id} označena jako zaplacená` : `${id} označena jako nezaplacená`, () => setOrders((os) => os.map((x) => (x.id === id ? { ...x, paid: !paid } : x))));
  };
  const copyForCarrier = async (o) => {
    const ok = await copyText(carrierText(o));
    showToast(ok ? 'Zkopírováno' : 'Kopírování se nepovedlo');
  };

  // Navigace
  const go = (s) => { setEditDraft(null); setScreen(s); };
  const goNew = () => { setEditDraft(null); setNewDraft((d) => d || newDraftFor(types)); setScreen('form'); };
  const openDetail = (o) => { setDetailId(o.id); setDetailFrom(screen === 'archive' ? 'archive' : 'orders'); setScreen('detail'); };
  const startEdit = (o) => { setEditDraft(draftFromOrder(o)); setScreen('form'); };
  const onSearch = (v) => { setQuery(v); if (v.trim() && screen !== 'orders' && screen !== 'archive') go('orders'); };

  const formDraft = editDraft || newDraft;
  const setFormDraft = editDraft ? setEditDraft : setNewDraft;

  const saveForm = () => {
    const d = formDraft;
    const id = d.id || nextId(orders, d.created_at); // čísla se počítají i z "náhrobků", aby se nikdy neopakovala
    const pickup = d.delivery_method === 'pickup';
    const items = d.items.map((i) => ({ id: i.id, order_id: id, product_type_id: Number(i.product_type_id), inscription: i.inscription.trim(), quantity: parseQty(i.quantity), unit_price: parseNum(i.unit_price) }));
    const price_total = d.pricing_mode === 'per_item' ? items.reduce((s, i) => s + i.quantity * i.unit_price, 0) : parseNum(d.price_manual);
    const status = FINAL.includes(d.status) ? finalFor(d.delivery_method) : d.status;
    const fields = { id, created_at: d.created_at, customer_name: d.customer_name.trim(), customer_contact: d.customer_contact.trim(), delivery_method: d.delivery_method, delivery_address: pickup ? '' : d.delivery_address.trim(), deadline: d.deadline, status, pricing_mode: d.pricing_mode, price_total, paid: !!d.paid, items };
    const order = d.id ? { ...orders.find((o) => o.id === id), ...fields } : { ...fields, uuid: newUuid(), updated_at: nowISO(), deleted_at: null };
    setOrders((os) => (d.id ? os.map((o) => (o.id === id ? order : o)) : [order, ...os]));
    if (d.id) {
      setEditDraft(null); setDetailId(id); setScreen('detail'); showToast(`${id} uložena`);
    } else {
      setNewDraft(null); setScreen(isActiveOrder(order) ? 'orders' : 'archive'); showToast(`Zakázka ${id} vytvořena`);
    }
  };
  const cancelForm = () => {
    if (editDraft) { setEditDraft(null); setScreen('detail'); } else { setNewDraft(null); setScreen('orders'); }
  };
  const deleteOrder = () => {
    const id = editDraft.id;
    const at = nowISO();
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, deleted_at: at } : o))); // měkké smazání, přenese se i na další zařízení
    setEditDraft(null); setScreen(detailFrom); showToast(`Zakázka ${id} smazána`);
  };

  const loadDemo = () => {
    const fresh = makeDemoOrders();
    setOrders((os) => [...fresh, ...os.filter((o) => !fresh.some((f) => f.id === o.id))]);
    showToast('Ukázkové zakázky přidány');
  };
  const removeDemo = () => {
    const at = nowISO();
    setOrders((os) => os.map((o) => (o.id.startsWith('#DEMO-') && !o.deleted_at ? { ...o, deleted_at: at } : o)));
    showToast('Ukázkové zakázky odebrány');
  };

  const lockNow = async () => { await persist(); onLock(); };
  const changePin = (oldPin, newPin) => onChangePin(oldPin, newPin, latest.current);

  const detailOrder = visible.find((o) => o.id === detailId);
  // Badge u "Zakázky": aktivní zakázky s termínem do 3 dnů nebo po termínu
  const urgent = visible.filter((o) => isActiveOrder(o) && o.deadline && daysUntil(o.deadline) <= 3).length;
  const titles = { orders: 'Zakázky', archive: 'Archiv', detail: 'Detail zakázky', form: editDraft ? `Úprava ${editDraft.id}` : 'Nová zakázka', stats: 'Statistiky', settings: 'Nastavení' };
  const activeNav = screen === 'detail' ? detailFrom : screen === 'form' ? (editDraft ? detailFrom : 'form') : screen;
  const NAV = [
    { id: 'orders', label: 'Zakázky', full: 'Zakázky', icon: 'list', go: () => go('orders') },
    { id: 'form', label: 'Nová', full: 'Nová zakázka', icon: 'plus', go: goNew },
    { id: 'stats', label: 'Statistiky', full: 'Statistiky', icon: 'chart', go: () => go('stats') },
    { id: 'archive', label: 'Archiv', full: 'Archiv', icon: 'archive', go: () => go('archive') },
    { id: 'settings', label: 'Nastavení', full: 'Nastavení', icon: 'sliders', go: () => go('settings') },
  ];

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <header className="sticky z-30 border-b border-stone-200 bg-stone-50/95 backdrop-blur dark:border-stone-800 dark:bg-stone-950/95" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
        <div className="mx-auto max-w-3xl space-y-3 px-4 pb-3 pt-3">
          <div className="flex items-center justify-between gap-3">
            <h1 className="min-w-0 truncate font-display text-2xl font-bold leading-none tracking-tight">{titles[screen]}</h1>
            <div className="-mr-1 flex shrink-0 items-center gap-2">
              <button type="button" onClick={lockNow} aria-label="Zamknout aplikaci"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-stone-300 bg-white text-stone-800 transition active:scale-95 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100">
                <Icon name="lock" />
              </button>
            <button type="button" onClick={() => setTheme(isDark ? 'light' : 'dark')} aria-label={isDark ? 'Přepnout na světlý režim' : 'Přepnout na tmavý režim'}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-stone-300 bg-white text-stone-800 transition active:scale-95 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100">
              <Icon name={isDark ? 'sun' : 'moon'} />
              </button>
            </div>
          </div>
          <div className="relative" role="search">
            <Icon name="search" size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
            <input id="global-search" aria-label="Hledat v zakázkách" className={`${inputCls} pl-11 pr-12`} value={query} onChange={(e) => onSearch(e.target.value)} placeholder="Hledat jméno, kontakt, adresu, motiv…" enterKeyHint="search" autoComplete="off" />
            {query && <button type="button" aria-label="Vymazat hledání" onClick={() => setQuery('')} className="absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-stone-500 dark:text-stone-400"><Icon name="x" /></button>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-36 pt-4">
        {screen === 'orders' && <ListScreen kind="active" orders={visible} types={types} query={query} prefs={prefs} setPrefs={setPrefs} onOpen={openDetail} onStatus={setStatus} onNew={goNew} onJump={() => go('archive')} statusFilter={statusFilter} setStatusFilter={setStatusFilter} onCopy={copyForCarrier} onPaid={setPaid} />}
        {screen === 'archive' && <ListScreen kind="archive" orders={visible} types={types} query={query} prefs={prefs} setPrefs={setPrefs} onOpen={openDetail} onStatus={setStatus} onNew={goNew} onJump={() => go('orders')} statusFilter={statusFilter} setStatusFilter={setStatusFilter} onCopy={copyForCarrier} onPaid={setPaid} />}
        {screen === 'detail' && detailOrder && <DetailScreen key={detailOrder.id} order={detailOrder} types={types} onBack={() => go(detailFrom)} onEdit={startEdit} onStatus={setStatus} onCopy={copyForCarrier} onPaid={setPaid} />}
        {screen === 'detail' && !detailOrder && <p className="py-10 text-center text-stone-600 dark:text-stone-400">Zakázka už neexistuje.</p>}
        {screen === 'form' && formDraft && <FormScreen key={editDraft ? editDraft.id : 'new'} draft={formDraft} setDraft={setFormDraft} types={types} onSave={saveForm} onCancel={cancelForm} onDelete={deleteOrder} />}
        {screen === 'stats' && <StatsScreen orders={visible} types={types} />}
        {screen === 'settings' && <SettingsScreen types={types} setTypes={setTypes} orders={visible} theme={theme} setTheme={setTheme} cloud={cloud} onLock={lockNow} onChangePin={changePin} hasDemo={hasDemo} onLoadDemo={loadDemo} onRemoveDemo={removeDemo} />}
      </main>

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)' }}>
          <div role="status" aria-live="polite" className="pointer-events-auto flex max-w-md items-center gap-2 rounded-xl bg-stone-900 py-1 pl-4 pr-1 text-sm font-medium text-white shadow-lg dark:bg-stone-100 dark:text-stone-900">
            <span className="py-2">{toast.msg}</span>
            {toast.undo && <button type="button" className="h-11 shrink-0 rounded-lg px-3 font-bold underline" onClick={() => { toast.undo(); setToast(null); }}>Vrátit</button>}
          </div>
        </div>
      )}

      <nav aria-label="Hlavní navigace" className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur dark:border-stone-800 dark:bg-stone-900/95" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="mx-auto flex max-w-3xl">
          {NAV.map((n) => {
            const active = activeNav === n.id;
            return (
              <button key={n.id} type="button" onClick={n.go} aria-label={n.id === 'orders' && urgent > 0 ? `${n.full}, ${urgent} k vyřízení` : n.full} aria-current={active ? 'page' : undefined}
                className={`relative flex h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 text-[11px] font-semibold transition ${active ? 'text-stone-900 dark:text-white' : 'text-stone-500 dark:text-stone-400'}`}>
                {active && <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-stone-900 dark:bg-white" />}
                <span className="relative">
                  <Icon name={n.icon} size={22} />
                  {n.id === 'orders' && urgent > 0 && (
                    <span className="absolute -right-3 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white dark:bg-red-500 dark:ring-stone-900">{urgent > 9 ? '9+' : urgent}</span>
                  )}
                </span>
                <span className="max-w-full truncate">{n.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
