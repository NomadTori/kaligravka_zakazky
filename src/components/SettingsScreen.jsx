import { useState } from 'react';
import { Icon } from './Icon';
import { Segmented, btnGhost, btnPrimary, btnDanger, cardCls, inputCls } from './ui';
import { czCount } from '../lib/utils';
import { PIN_RE, isWeakPin } from '../lib/vault';

const digitsOnly = (v) => v.replace(/\D/g, '').slice(0, 4);

function friendlyError(msg) {
  if (/schema cache|does not exist|PGRST205|42P01/i.test(msg)) return `${msg} Spusťte nejdřív soubor supabase/schema.sql v SQL Editoru Supabase.`;
  if (/invalid login/i.test(msg)) return 'Špatný e-mail nebo heslo.';
  return msg;
}

function SecuritySection({ onLock, onChangePin }) {
  const [open, setOpen] = useState(false);
  const [oldPin, setOld] = useState('');
  const [newPin, setNew] = useState('');
  const [again, setAgain] = useState('');
  const [msg, setMsg] = useState(null); // { ok, text }
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!PIN_RE.test(oldPin)) return setMsg({ ok: false, text: 'Zadejte stávající PIN (4 číslice).' });
    if (!PIN_RE.test(newPin)) return setMsg({ ok: false, text: 'Nový PIN musí mít 4 číslice.' });
    if (isWeakPin(newPin)) return setMsg({ ok: false, text: 'Zvolte méně očekávatelný PIN (ne 1234, 0000 apod.).' });
    if (newPin !== again) return setMsg({ ok: false, text: 'Nové PINy se neshodují.' });
    setBusy(true);
    try {
      const r = await onChangePin(oldPin, newPin);
      if (r.ok) { setMsg({ ok: true, text: 'PIN je změněný a data jsou přešifrovaná.' }); setOld(''); setNew(''); setAgain(''); setOpen(false); }
      else if (r.reason === 'locked') setMsg({ ok: false, text: `Příliš mnoho pokusů. Zkuste to za ${Math.ceil(r.waitMs / 1000)} s.` });
      else setMsg({ ok: false, text: 'Stávající PIN není správný.' });
    } catch (err) {
      setMsg({ ok: false, text: `Chyba: ${err.message || err}` });
    } finally { setBusy(false); }
  };

  const pinInput = (id, label, value, set) => (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-stone-700 dark:text-stone-300">{label}</label>
      <input id={id} type="password" inputMode="numeric" autoComplete="off" maxLength={4} className={`${inputCls} tracking-[0.5em]`} value={value} onChange={(e) => set(digitsOnly(e.target.value))} />
    </div>
  );

  return (
    <section className={`${cardCls} space-y-3 p-4`}>
      <h2 className="font-display text-lg font-bold">Zabezpečení</h2>
      <p className="text-sm text-stone-500 dark:text-stone-400">Data v zařízení jsou šifrovaná PINem (AES-GCM). Po 5 minutách na pozadí se aplikace sama zamkne.</p>
      <button type="button" className={`${btnGhost} w-full`} onClick={onLock}><Icon name="lock" size={18} />Zamknout nyní</button>
      {!open ? (
        <button type="button" className={`${btnGhost} w-full`} onClick={() => { setOpen(true); setMsg(null); }}>Změnit PIN</button>
      ) : (
        <form onSubmit={submit} className="space-y-3 rounded-xl bg-stone-50 p-3 dark:bg-stone-800/50">
          {pinInput('pin-old', 'Stávající PIN', oldPin, setOld)}
          {pinInput('pin-new', 'Nový PIN', newPin, setNew)}
          {pinInput('pin-again', 'Nový PIN znovu', again, setAgain)}
          <div className="grid grid-cols-2 gap-2">
            <button type="submit" disabled={busy} className={btnPrimary}>{busy ? 'Měním…' : 'Změnit PIN'}</button>
            <button type="button" className={btnGhost} onClick={() => { setOpen(false); setMsg(null); }}>Zrušit</button>
          </div>
        </form>
      )}
      {msg && <p role="status" className={`text-sm font-medium ${msg.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-400'}`}>{msg.text}</p>}
    </section>
  );
}

function CloudSection({ cloud }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const login = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const m = await cloud.signIn(email, password);
      if (m) setErr(friendlyError(m)); else setPassword('');
    } catch (ex) { setErr(friendlyError(ex.message || String(ex))); } finally { setBusy(false); }
  };

  const statusText = {
    idle: 'Čeká na synchronizaci',
    syncing: 'Synchronizuji…',
    ok: cloud.lastSync ? `Synchronizováno v ${cloud.lastSync.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}` : 'Synchronizováno',
    offline: 'Jste offline. Synchronizace proběhne po připojení.',
    error: `Chyba synchronizace: ${friendlyError(cloud.error)}`,
  }[cloud.status];

  return (
    <section className={`${cardCls} space-y-3 p-4`}>
      <h2 className="font-display text-lg font-bold">Cloud (Supabase)</h2>
      {!cloud.ready ? (
        <p className="text-sm text-stone-500 dark:text-stone-400">Načítám…</p>
      ) : !cloud.user ? (
        <form onSubmit={login} className="space-y-3">
          <p className="text-sm text-stone-500 dark:text-stone-400">Bez přihlášení se data ukládají jen šifrovaně v tomto zařízení. Přihlášením se zapne záloha a synchronizace mezi zařízeními.</p>
          <div className="space-y-1.5">
            <label htmlFor="sb-email" className="block text-sm font-semibold text-stone-700 dark:text-stone-300">E-mail</label>
            <input id="sb-email" type="email" autoComplete="username" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="sb-pass" className="block text-sm font-semibold text-stone-700 dark:text-stone-300">Heslo</label>
            <input id="sb-pass" type="password" autoComplete="current-password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {err && <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">{err}</p>}
          <button type="submit" disabled={busy || !email || !password} className={`${btnPrimary} w-full`}>{busy ? 'Přihlašuji…' : 'Přihlásit a synchronizovat'}</button>
        </form>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl bg-stone-100 px-4 py-3 text-sm dark:bg-stone-800/70">
            <p className="font-semibold text-stone-900 dark:text-stone-100">{cloud.user.email}</p>
            <p className={`mt-0.5 ${cloud.status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-stone-600 dark:text-stone-300'}`}>{statusText}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={btnGhost} disabled={cloud.status === 'syncing'} onClick={cloud.syncNow}><Icon name="reset" size={18} />Synchronizovat</button>
            <button type="button" className={btnGhost} onClick={cloud.signOut}>Odhlásit</button>
          </div>
        </div>
      )}
    </section>
  );
}

export function SettingsScreen({ types, setTypes, orders, theme, setTheme, cloud, onLock, onChangePin, hasDemo, onLoadDemo, onRemoveDemo }) {
  const [newName, setNewName] = useState('');
  const [confirmDemo, setConfirmDemo] = useState(false);
  const usage = (id) => orders.filter((o) => o.items.some((i) => i.product_type_id === id)).length;
  const rename = (id, name) => setTypes((ts) => ts.map((t) => (t.id === id ? { ...t, name } : t)));
  const toggle = (id) => setTypes((ts) => ts.map((t) => (t.id === id ? { ...t, is_active: !t.is_active } : t)));
  const add = (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setTypes((ts) => [...ts, { id: Date.now(), name, is_active: true }]); // časové razítko jako ID: bez kolizí mezi zařízeními
    setNewName('');
  };

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <SecuritySection onLock={onLock} onChangePin={onChangePin} />
      <CloudSection cloud={cloud} />

      <section className={`${cardCls} space-y-3 p-4`}>
        <h2 className="font-display text-lg font-bold">Vzhled při spuštění</h2>
        <Segmented label="Motiv" value={theme} onChange={setTheme} options={[{ value: 'system', label: 'Podle systému' }, { value: 'light', label: 'Světlý' }, { value: 'dark', label: 'Tmavý' }]} />
        <p className="text-sm text-stone-500 dark:text-stone-400">Volba se pamatuje. Přepínač slunce/měsíc v hlavičce ji změní také.</p>
      </section>

      <section className={`${cardCls} space-y-3 p-4`}>
        <div>
          <h2 className="font-display text-lg font-bold">Typy výrobků</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">Skrytý typ zmizí z nabídky ve formuláři, ale zůstane u starých zakázek.</p>
        </div>
        <ul className="space-y-2">
          {types.map((t) => {
            const n = usage(t.id);
            return (
              <li key={t.id} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <input aria-label={`Název typu ${t.name}`} className={`${inputCls} ${t.is_active ? '' : 'text-stone-400 dark:text-stone-500'}`} value={t.name} onChange={(e) => rename(t.id, e.target.value)} onBlur={() => { if (!t.name.trim()) rename(t.id, 'Nový typ'); }} />
                  <p className="mt-0.5 px-1 text-xs text-stone-500 dark:text-stone-400">{n === 0 ? 'zatím nepoužito' : `použito v ${n} ${czCount(n, 'zakázce', 'zakázkách', 'zakázkách')}`}{t.is_active ? '' : ' · skrytý'}</p>
                </div>
                <button type="button" role="switch" aria-checked={t.is_active} aria-label={t.is_active ? `Skrýt typ ${t.name}` : `Zobrazit typ ${t.name}`} onClick={() => toggle(t.id)}
                  className={`mb-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition active:scale-95 ${t.is_active ? 'border-stone-300 bg-white text-stone-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100' : 'border-stone-200 bg-stone-100 text-stone-400 dark:border-stone-800 dark:bg-stone-800 dark:text-stone-500'}`}>
                  <Icon name={t.is_active ? 'eye' : 'eyeoff'} />
                </button>
              </li>
            );
          })}
        </ul>
        <form onSubmit={add} className="flex gap-2 pt-1">
          <input aria-label="Název nového typu" className={inputCls} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nový typ, např. Karafy" autoComplete="off" />
          <button type="submit" className={`${btnPrimary} shrink-0 px-4`}><Icon name="plus" size={20} />Přidat</button>
        </form>
      </section>

      <section className={`${cardCls} space-y-3 p-4`}>
        <h2 className="font-display text-lg font-bold">Ukázkové zakázky</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">Pro vyzkoušení aplikace. Mají čísla #DEMO a po přihlášení do cloudu se synchronizují jako ostatní zakázky.</p>
        {!hasDemo ? (
          <button type="button" className={`${btnGhost} w-full`} onClick={onLoadDemo}><Icon name="plus" size={18} />Přidat ukázkové zakázky</button>
        ) : !confirmDemo ? (
          <button type="button" className={`${btnDanger} w-full`} onClick={() => setConfirmDemo(true)}><Icon name="trash" size={18} />Odebrat ukázkové zakázky</button>
        ) : (
          <div className="space-y-2 rounded-xl border border-red-300 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/40">
            <p className="text-sm font-semibold text-red-800 dark:text-red-200">Odeberu jen zakázky s číslem #DEMO. Vaše vlastní zůstanou.</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="h-12 rounded-xl bg-red-600 text-base font-semibold text-white dark:bg-red-500 dark:text-red-950" onClick={() => { onRemoveDemo(); setConfirmDemo(false); }}>Ano, odebrat</button>
              <button type="button" className={btnGhost} onClick={() => setConfirmDemo(false)}>Ne</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
