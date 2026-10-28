import { useCallback, useEffect, useRef, useState } from 'react';
import logo from '../assets/logo.png';
import { Icon } from './Icon';
import { isWeakPin, lockoutRemaining } from '../lib/vault';

/**
 * Obrazovka s PINem (vždy tmavá, aby bylo bílé logo čitelné).
 *  mode = 'setup'  → vytvoření PINu (zadat dvakrát)
 *  mode = 'unlock' → odemknutí
 */
export function PinScreen({ mode, onCreate, onUnlock, onForgot }) {
  const [digits, setDigits] = useState('');
  const [first, setFirst] = useState(null); // PIN z prvního kroku při vytváření
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [waitMs, setWaitMs] = useState(() => (mode === 'unlock' ? lockoutRemaining() : 0));
  const [confirmForgot, setConfirmForgot] = useState(false);
  const digitsRef = useRef('');
  digitsRef.current = digits;
  const setup = mode === 'setup';
  const locked = waitMs > 0;

  // odpočet zámku po špatných pokusech
  useEffect(() => {
    if (waitMs <= 0) return undefined;
    const t = setInterval(() => setWaitMs(lockoutRemaining()), 500);
    return () => clearInterval(t);
  }, [waitMs > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = useCallback(async (pin) => {
    setBusy(true);
    setMessage('');
    try {
      if (setup) {
        if (first === null) {
          if (isWeakPin(pin)) { setMessage('Zvolte méně očekávatelný PIN (ne 1234, 0000 apod.).'); setDigits(''); return; }
          setFirst(pin); setDigits(''); return;
        }
        if (pin !== first) { setMessage('PINy se neshodují. Zkuste to znovu od začátku.'); setFirst(null); setDigits(''); return; }
        await onCreate(pin);
      } else {
        const r = await onUnlock(pin);
        if (!r.ok) {
          setDigits('');
          if (r.waitMs > 0) { setWaitMs(r.waitMs); setMessage('Příliš mnoho špatných pokusů.'); }
          else setMessage(r.attemptsLeft > 0 && r.attemptsLeft < 3 ? `Špatný PIN. Zbývá pokusů: ${r.attemptsLeft}.` : 'Špatný PIN.');
        }
      }
    } catch (e) {
      setMessage(`Chyba: ${(e && e.message) || e}`);
      setDigits('');
    } finally {
      setBusy(false);
    }
  }, [setup, first, onCreate, onUnlock]);

  const press = useCallback((d) => {
    if (busy || waitMs > 0) return;
    const cur = digitsRef.current;
    if (cur.length >= 4) return;
    const next = cur + d;
    setDigits(next);
    setMessage('');
    if (next.length === 4) submit(next);
  }, [busy, waitMs, submit]);

  const back = useCallback(() => { if (!busy) setDigits((x) => x.slice(0, -1)); }, [busy]);

  // klávesnice počítače
  useEffect(() => {
    const onKey = (e) => {
      if (confirmForgot) return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press, back, confirmForgot]);

  const title = setup ? (first === null ? 'Vytvořte si 4místný PIN' : 'Zopakujte PIN') : 'Zadejte PIN';
  const sub = setup
    ? (first === null ? 'Chrání zakázky a údaje zákazníků v tomto zařízení. Nezapomeňte ho, nejde obnovit.' : 'Zadejte stejný PIN ještě jednou.')
    : 'Aplikace je zamčená.';
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const keyCls = 'flex h-16 w-16 items-center justify-center rounded-full bg-stone-800 text-2xl font-semibold text-stone-50 transition active:scale-95 active:bg-stone-700 disabled:opacity-40 sm:h-[72px] sm:w-[72px]';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-950 px-6 py-8 text-stone-100" style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))', paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
      <img src={logo} alt="kali GRAVKA" className="mb-8 w-52 max-w-[70%]" />
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <p className="mt-1 max-w-xs text-center text-sm text-stone-400">{sub}</p>

      <div className="my-6 flex gap-4" aria-label={`Zadáno ${digits.length} z 4 číslic`} role="img">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-4 w-4 rounded-full border-2 transition ${i < digits.length ? 'border-stone-50 bg-stone-50' : 'border-stone-500'}`} />
        ))}
      </div>

      <p role="status" aria-live="polite" className="mb-4 min-h-[40px] max-w-xs text-center text-sm font-medium text-red-300">
        {locked ? `${message ? message + ' ' : ''}Zkuste to za ${Math.ceil(waitMs / 1000)} s.` : message || (busy ? 'Ověřuji…' : '')}
      </p>

      <div className="grid grid-cols-3 gap-4">
        {keys.map((k) => <button key={k} type="button" className={keyCls} disabled={busy || locked} onClick={() => press(k)} aria-label={k}>{k}</button>)}
        <span />
        <button type="button" className={keyCls} disabled={busy || locked} onClick={() => press('0')} aria-label="0">0</button>
        <button type="button" className="flex h-16 w-16 items-center justify-center rounded-full text-stone-300 transition active:scale-95 disabled:opacity-40 sm:h-[72px] sm:w-[72px]" disabled={busy || digits.length === 0} onClick={back} aria-label="Smazat poslední číslici"><Icon name="back" size={26} /></button>
      </div>

      {!setup && !confirmForgot && (
        <button type="button" onClick={() => setConfirmForgot(true)} className="mt-8 h-11 px-4 text-sm text-stone-400 underline">Zapomenutý PIN</button>
      )}
      {!setup && confirmForgot && (
        <div className="mt-6 max-w-xs space-y-3 rounded-2xl border border-red-900 bg-red-950/40 p-4 text-sm">
          <p className="text-red-200">Zapomenutý PIN nejde obnovit. Smažu PIN, zakázky a přihlášení uložené v tomto zařízení. Data v Supabase zůstanou a po novém nastavení a přihlášení se stáhnou zpět.</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="h-12 rounded-xl bg-red-600 font-semibold text-white" onClick={onForgot}>Smazat vše</button>
            <button type="button" className="h-12 rounded-xl border border-stone-600 font-medium" onClick={() => setConfirmForgot(false)}>Zpět</button>
          </div>
        </div>
      )}
    </div>
  );
}
