// Pomocné funkce: stavy, datum/čas, formátování, vyhledávání, schránka.
export const CHART_COLORS = ['#2563eb', '#d97706', '#0d9488', '#c026d3', '#e11d48', '#65a30d'];

/* Stavy: aktivní = Přijato, Hotovo. Archiv = Odesláno / Odevzdáno (osobní odběr) / Stornováno. */
export const FINAL = ['Odesláno', 'Odevzdáno'];
export const ACTIVE = ['Přijato', 'Hotovo'];
export const isActiveOrder = (o) => ACTIVE.includes(o.status);
export const isSent = (o) => FINAL.includes(o.status); // jen tyto zakázky jdou do statistik
export const finalFor = (method) => (method === 'pickup' ? 'Odevzdáno' : 'Odesláno');

export const pad = (n) => String(n).padStart(2, '0');
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const todayISO = () => toISO(new Date());
export const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return toISO(d); };
export const daysUntil = (s) => Math.round((parseISO(s) - parseISO(todayISO())) / 86400000);
export const fmtDate = (s) => (s ? parseISO(s).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' }) : '');
export const fmtShort = (s) => parseISO(s).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });
export const fmtMoney = (n) => new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 0 }).format(Math.round(n || 0)) + ' Kč';
export const fmtAxis = (v) => (v >= 1000 ? `${(v / 1000).toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} tis.` : String(Math.round(v)));
export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const czDays = (n) => (n === 1 ? 'den' : n >= 2 && n <= 4 ? 'dny' : 'dní');
export const czCount = (n, a, b, c) => (n === 1 ? a : n >= 2 && n <= 4 ? b : c);
export const uid = () => Math.random().toString(36).slice(2, 10);
export const parseNum = (v) => { const n = parseFloat(String(v).replace(',', '.').replace(/\s/g, '')); return Number.isFinite(n) && n > 0 ? n : 0; };
export const parseQty = (v) => Math.max(1, parseInt(v, 10) || 1);
export const MONTHS = Array.from({ length: 12 }, (_, i) => cap(new Date(2000, i, 1).toLocaleDateString('cs-CZ', { month: 'long' })));

/* Vyhledávání: bez diakritiky, bez ohledu na velikost písmen, všechna slova musí sedět (napříč poli) */
export const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const tokens = (q) => norm(q).split(/\s+/).filter(Boolean);
export const haystack = (o) => norm([o.customer_name, o.customer_contact, o.delivery_address, ...o.items.map((i) => i.inscription)].join(' \n '));
export const matches = (o, q) => { const t = tokens(q); if (!t.length) return true; const h = haystack(o); return t.every((x) => h.includes(x)); };
export const fieldHit = (text, q) => { const t = tokens(q); return t.length > 0 && t.some((x) => norm(text).includes(x)); };

/* Kopírování pro dopravce: jméno, kontakt (telefon), adresa – každé na vlastním řádku */
export const carrierText = (o) => [o.customer_name, o.customer_contact, o.delivery_address].filter((x) => x && x.trim()).join('\n');
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* zkusíme záložní postup */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (e) { return false; }
}


export const nowISO = () => new Date().toISOString();
export const typeNameOf = (types, id) => (types.find((t) => t.id === id) || {}).name || 'Neznámý typ';
export const newUuid = () => (globalThis.crypto && crypto.randomUUID ? crypto.randomUUID() : `${uid()}-${uid()}-${uid()}`);
