// Trezor: 4místný PIN, šifrovaná lokální data a ochrana proti hádání PINu.
//
// PIN se nikdy neukládá (ani jako hash). Uložíme jen náhodnou sůl a krátký "ověřovací" text zašifrovaný
// klíčem odvozeným z PINu. Správný PIN poznáme tak, že se ověřovací text podaří dešifrovat (AES-GCM má
// vestavěnou kontrolu integrity). Klíč žije jen v paměti, po zamknutí nebo zavření aplikace zmizí.
import { PBKDF2_ITERATIONS, deriveKey, randomBytes, toB64, fromB64, encryptString, decryptString, encryptJSON, decryptJSON } from './crypto';


const PIN_KEY = 'ez.pin.v1';
const DATA_KEY = 'ez.data.v1';
const FAIL_KEY = 'ez.fails.v1';
export const SB_PREFIX = 'ez.sb.'; // sem supabase-js ukládá (zašifrovanou) přihlašovací relaci
const CHECK_TEXT = 'kali-gravka:pin-ok:v1';
const MAX_FREE_ATTEMPTS = 5;

export const PIN_RE = /^\d{4}$/;
export const isWeakPin = (pin) => /^(\d)\1{3}$/.test(pin) || ['1234', '4321', '0123', '2580'].includes(pin);

const readRecord = () => {
  try { return JSON.parse(localStorage.getItem(PIN_KEY) || 'null'); } catch (e) { return null; }
};
export const hasPin = () => !!readRecord();

function readFails() {
  try {
    const f = JSON.parse(localStorage.getItem(FAIL_KEY) || 'null');
    if (f && typeof f.count === 'number') return { count: f.count, until: f.until || 0 };
  } catch (e) { /* nic */ }
  return { count: 0, until: 0 };
}
const writeFails = (f) => localStorage.setItem(FAIL_KEY, JSON.stringify(f));

/** Kolik milisekund ještě zbývá do konce zámku po špatných pokusech. */
export const lockoutRemaining = () => Math.max(0, readFails().until - Date.now());

export function wipeLocalData() {
  const doomed = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && (k === DATA_KEY || k.startsWith(SB_PREFIX))) doomed.push(k);
  }
  doomed.forEach((k) => localStorage.removeItem(k));
}

/** Smaže PIN, data a přihlášení v tomto zařízení (nastavení vzhledu zůstane). */
export function wipeAll() {
  wipeLocalData();
  localStorage.removeItem(PIN_KEY);
  localStorage.removeItem(FAIL_KEY);
}

async function newPinRecord(pin) {
  const salt = randomBytes(16);
  const key = await deriveKey(pin, salt, PBKDF2_ITERATIONS);
  const check = await encryptString(key, CHECK_TEXT);
  return { key, record: { v: 1, salt: toB64(salt), iter: PBKDF2_ITERATIONS, check } };
}

/** První spuštění: vytvoří PIN a vrátí klíč. */
export async function createPin(pin) {
  if (!PIN_RE.test(pin)) throw new Error('PIN musí mít 4 číslice');
  wipeLocalData(); // data bez PINu by stejně nešla přečíst
  const { key, record } = await newPinRecord(pin);
  localStorage.setItem(PIN_KEY, JSON.stringify(record));
  writeFails({ count: 0, until: 0 });
  return key;
}

/** Zkusí PIN. Vrací { ok:true, key } nebo { ok:false, reason, waitMs?, attemptsLeft? }. */
export async function unlockWithPin(pin) {
  if (!PIN_RE.test(pin)) return { ok: false, reason: 'format' };
  const wait = lockoutRemaining();
  if (wait > 0) return { ok: false, reason: 'locked', waitMs: wait };
  const rec = readRecord();
  if (!rec) return { ok: false, reason: 'nopin' };
  const key = await deriveKey(pin, fromB64(rec.salt), rec.iter);
  try {
    if ((await decryptString(key, rec.check)) === CHECK_TEXT) {
      writeFails({ count: 0, until: 0 });
      return { ok: true, key };
    }
  } catch (e) { /* špatný PIN: dešifrování selže */ }
  const count = readFails().count + 1;
  const until = count >= MAX_FREE_ATTEMPTS ? Date.now() + Math.min(30000 * 2 ** (count - MAX_FREE_ATTEMPTS), 15 * 60000) : 0;
  writeFails({ count, until });
  return { ok: false, reason: 'wrong', waitMs: Math.max(0, until - Date.now()), attemptsLeft: Math.max(0, MAX_FREE_ATTEMPTS - count) };
}

export async function loadData(key) {
  const raw = localStorage.getItem(DATA_KEY);
  if (!raw) return null;
  return decryptJSON(key, raw);
}

export async function saveData(key, data) {
  localStorage.setItem(DATA_KEY, await encryptJSON(key, data));
}

async function reencryptSupabaseStorage(oldKey, newKey) {
  const updates = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(SB_PREFIX)) continue;
    try {
      const plain = await decryptString(oldKey, localStorage.getItem(k));
      updates.push([k, await encryptString(newKey, plain)]);
    } catch (e) { /* nečitelnou položku přeskočíme; supabase si vyžádá nové přihlášení */ }
  }
  return updates;
}

/** Změna PINu: ověří starý, vše přešifruje novým klíčem a zapíše najednou. */
export async function changePin({ oldPin, newPin, oldKey, data }) {
  if (!PIN_RE.test(newPin)) return { ok: false, reason: 'format' };
  const check = await unlockWithPin(oldPin);
  if (!check.ok) return check;
  const { key, record } = await newPinRecord(newPin);
  const blob = await encryptJSON(key, data);
  const sbUpdates = await reencryptSupabaseStorage(oldKey, key);
  localStorage.setItem(PIN_KEY, JSON.stringify(record));
  localStorage.setItem(DATA_KEY, blob);
  sbUpdates.forEach(([k, v]) => localStorage.setItem(k, v));
  return { ok: true, key };
}
