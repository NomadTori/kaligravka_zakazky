// Šifrování přes Web Crypto API: PBKDF2-SHA256 (odvození klíče z PINu) + AES-GCM 256 (šifrování dat).
// Klíč je nastavený jako "non-extractable", takže ho nelze z JavaScriptu vyexportovat.

const enc = new TextEncoder();
const dec = new TextDecoder();

// Počet iterací PBKDF2. Vyšší číslo = pomalejší odemykání, ale i pomalejší hádání PINu.
export const PBKDF2_ITERATIONS = 600000;

export function toB64(bytes) {
  let s = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(s);
}

export function fromB64(str) {
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export const randomBytes = (n) => crypto.getRandomValues(new Uint8Array(n));

export async function deriveKey(pin, salt, iterations = PBKDF2_ITERATIONS) {
  const base = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

// Formát výstupu: "v1.<iv>.<ciphertext>" (base64 neobsahuje tečku, takže dělení je bezpečné)
export async function encryptString(key, text) {
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text));
  return `v1.${toB64(iv)}.${toB64(new Uint8Array(ct))}`;
}

export async function decryptString(key, packed) {
  const [v, iv, ct] = String(packed).split('.');
  if (v !== 'v1' || !iv || !ct) throw new Error('Neznámý formát šifrovaných dat');
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(iv) }, key, fromB64(ct));
  return dec.decode(pt);
}

export const encryptJSON = (key, obj) => encryptString(key, JSON.stringify(obj));
export const decryptJSON = async (key, packed) => JSON.parse(await decryptString(key, packed));
