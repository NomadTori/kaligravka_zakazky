// Hook pro přihlášení do Supabase a synchronizaci. Používá se jen uvnitř odemčené aplikace.
import { useCallback, useEffect, useRef, useState } from 'react';
import { openSupabase, closeSupabase, getSupabase } from './supabase';
import { runSync } from './sync';

export function useCloud({ cryptoKey, getLocal, applyRemote, rev }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | syncing | ok | offline | error
  const [error, setError] = useState('');
  const [lastSync, setLastSync] = useState(null);
  const busy = useRef(false);
  const again = useRef(false);
  const userRef = useRef(null);
  const fnRef = useRef({ getLocal, applyRemote });
  fnRef.current = { getLocal, applyRemote };

  // Klient vzniká až tady, tedy až po odemčení PINem. Při zamknutí se zahodí.
  useEffect(() => {
    const client = openSupabase(cryptoKey);
    let active = true;
    client.auth.getSession().then(({ data }) => {
      if (!active) return;
      userRef.current = data.session ? data.session.user : null;
      setUser(userRef.current);
      setReady(true);
    });
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      userRef.current = session ? session.user : null;
      setUser(userRef.current);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
      closeSupabase();
    };
  }, [cryptoKey]);

  const syncNow = useCallback(async () => {
    const u = userRef.current;
    if (!u) return;
    if (!navigator.onLine) { setStatus('offline'); return; }
    if (busy.current) { again.current = true; return; }
    busy.current = true;
    setStatus('syncing');
    setError('');
    try {
      await runSync(getSupabase(), u.id, () => fnRef.current.getLocal(), (r) => fnRef.current.applyRemote(r));
      setLastSync(new Date());
      setStatus('ok');
    } catch (e) {
      setStatus('error');
      setError((e && e.message) || String(e));
    } finally {
      busy.current = false;
      if (again.current) { again.current = false; setTimeout(syncNow, 400); }
    }
  }, []);

  // po přihlášení hned synchronizovat
  useEffect(() => { if (user) syncNow(); else setStatus('idle'); }, [user, syncNow]);

  // po každé lokální změně s krátkou prodlevou
  useEffect(() => {
    if (!user || rev === 0) return undefined;
    const t = setTimeout(syncNow, 1500);
    return () => clearTimeout(t);
  }, [rev, user, syncNow]);

  // při návratu online / do aplikace a občas na pozadí
  useEffect(() => {
    if (!user) return undefined;
    const onVisible = () => { if (document.visibilityState === 'visible') syncNow(); };
    const onOnline = () => syncNow();
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    const timer = setInterval(() => { if (document.visibilityState === 'visible') syncNow(); }, 90000);
    return () => { window.removeEventListener('online', onOnline); document.removeEventListener('visibilitychange', onVisible); clearInterval(timer); };
  }, [user, syncNow]);

  const signIn = useCallback(async (email, password) => {
    const { error: err } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
    return err ? err.message : null;
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
    setStatus('idle');
  }, []);

  return { user, ready, status, error, lastSync, signIn, signOut, syncNow };
}
