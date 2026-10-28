import { StrictMode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { PinScreen } from './components/PinScreen';
import { hasPin, createPin, unlockWithPin, loadData, changePin, wipeAll } from './lib/vault';
import { defaultTypes } from './lib/data';
import { newUuid, nowISO } from './lib/utils';

const THEME_KEY = 'ez.theme';
const AUTO_LOCK_MS = 5 * 60 * 1000; // po 5 minutách na pozadí se aplikace zamkne
const EPOCH = '1970-01-01T00:00:00.000Z';

// Doplní pole, která starší data nemají (uuid, časy změn, příznaky).
function normalize(data) {
  const d = data || {};
  const stamp = nowISO();
  const orders = (d.orders || []).map((o) => ({
    paid: false, delivery_method: 'shipping', deleted_at: null, ...o,
    uuid: o.uuid || newUuid(), updated_at: o.updated_at || stamp,
  }));
  const types = (d.types && d.types.length ? d.types : defaultTypes()).map((t) => ({ ...t, updated_at: t.updated_at || EPOCH }));
  return { orders, types };
}

function useTheme() {
  const [theme, setThemeState] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) || 'system'; } catch (e) { return 'system'; }
  });
  const [sysDark, setSysDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const h = (e) => setSysDark(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  const isDark = theme === 'dark' || (theme === 'system' && sysDark);
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? '#0c0a09' : '#fafaf9');
  }, [isDark]);
  const setTheme = useCallback((t) => {
    setThemeState(t);
    try { localStorage.setItem(THEME_KEY, t); } catch (e) { /* ignoruj */ }
  }, []);
  return { theme, setTheme, isDark };
}

function Root() {
  const { theme, setTheme, isDark } = useTheme();
  const [phase, setPhase] = useState(() => (hasPin() ? 'locked' : 'setup'));
  const [session, setSession] = useState(null); // { key, data, id } – existuje jen po odemčení
  const hiddenAt = useRef(0);

  const lock = useCallback(() => { setSession(null); setPhase('locked'); }, []);

  // Automatické zamčení po delší nečinnosti (aplikace na pozadí)
  useEffect(() => {
    if (phase !== 'unlocked') return undefined;
    const onVis = () => {
      if (document.visibilityState === 'hidden') hiddenAt.current = Date.now();
      else if (hiddenAt.current && Date.now() - hiddenAt.current > AUTO_LOCK_MS) { hiddenAt.current = 0; lock(); }
      else hiddenAt.current = 0;
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [phase, lock]);

  const onCreate = async (pin) => {
    const key = await createPin(pin);
    setSession({ key, data: normalize(null), id: 1 });
    setPhase('unlocked');
  };

  const onUnlock = async (pin) => {
    const r = await unlockWithPin(pin);
    if (!r.ok) return r;
    let data = null;
    try { data = await loadData(r.key); } catch (e) { return { ok: false, reason: 'corrupt', attemptsLeft: 5 }; }
    setSession({ key: r.key, data: normalize(data), id: Date.now() });
    setPhase('unlocked');
    return r;
  };

  const onForgot = () => { wipeAll(); setSession(null); setPhase('setup'); };

  const onChangePin = async (oldPin, newPin, data) => {
    const r = await changePin({ oldPin, newPin, oldKey: session.key, data: { v: 1, orders: data.orders, types: data.types } });
    if (r.ok) setSession((s) => ({ ...s, key: r.key })); // stejné id → aplikace se nepřemontuje
    return r;
  };

  if (phase === 'setup') return <PinScreen mode="setup" onCreate={onCreate} />;
  if (phase === 'locked' || !session) return <PinScreen mode="unlock" onUnlock={onUnlock} onForgot={onForgot} />;
  return <App key={session.id} initial={session.data} cryptoKey={session.key} theme={theme} setTheme={setTheme} isDark={isDark} onLock={lock} onChangePin={onChangePin} />;
}

createRoot(document.getElementById('root')).render(<StrictMode><Root /></StrictMode>);

// Service worker jen v produkčním sestavení (ve vývoji by rušil hot reload)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => { /* offline režim prostě nebude */ });
  });
}
