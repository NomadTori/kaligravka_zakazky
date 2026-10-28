// Konfigurace a inicializace Supabase (@supabase/supabase-js).
//
// Klient se vytvoří AŽ PO zadání správného PINu (openSupabase) a při zamknutí se zahodí (closeSupabase).
// Všechna volání v aplikaci jdou přes getSupabase(), které bez odemčení vyhodí chybu.
// Přihlašovací relaci (tokeny) supabase-js ukládá přes vlastní úložiště, které ji šifruje klíčem z PINu.
import { createClient } from '@supabase/supabase-js';
import { decryptString, encryptString } from './crypto';
import { SB_PREFIX } from './vault';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ciiplrqigdhbkcbsddbh.supabase.co';
// Anon klíč je veřejný (je součástí každého webu). Skutečnou ochranu dat zajišťují RLS pravidla v databázi.
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpaXBscnFpZ2RoYmtjYnNkZGJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0MjQxNjgsImV4cCI6MjEwODAwMDE2OH0.UKb5AIq4pxq6VuWtyZ1Jxpp1oJsGyIfJ0C8CCmtL9pk';

let client = null;

function encryptedStorage(key) {
  return {
    async getItem(name) {
      const raw = localStorage.getItem(SB_PREFIX + name);
      if (!raw) return null;
      try { return await decryptString(key, raw); } catch (e) { return null; }
    },
    async setItem(name, value) { localStorage.setItem(SB_PREFIX + name, await encryptString(key, value)); },
    async removeItem(name) { localStorage.removeItem(SB_PREFIX + name); },
  };
}

/** Vytvoří klienta. Volat jen s klíčem z odemčeného trezoru. */
export function openSupabase(cryptoKey) {
  closeSupabase();
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: encryptedStorage(cryptoKey),
      storageKey: 'auth',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}

export function getSupabase() {
  if (!client) throw new Error('Aplikace je zamčená. Zadejte PIN.');
  return client;
}

export function closeSupabase() {
  if (client) {
    try { client.auth.stopAutoRefresh(); } catch (e) { /* nic */ }
  }
  client = null;
}
