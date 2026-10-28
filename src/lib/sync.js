// Synchronizace s Supabase: po zakázkách a typech výrobků, vyhrává novější změna (updated_at).
// Smazané zakázky zůstávají jako "náhrobek" (deleted_at), aby se smazání přeneslo i do dalších zařízení.
import { nextId } from './data';

const PAGE = 1000;
const CHUNK = 200;
const ts = (s) => (s ? Date.parse(s) || 0 : 0);
const iso = (s) => (s ? new Date(s).toISOString() : null);

const orderToRow = (o, userId) => ({
  user_id: userId,
  id: o.id,
  uuid: o.uuid || null,
  created_at: o.created_at,
  customer_name: o.customer_name,
  customer_contact: o.customer_contact || '',
  delivery_method: o.delivery_method || 'shipping',
  delivery_address: o.delivery_address || '',
  deadline: o.deadline || null,
  status: o.status,
  pricing_mode: o.pricing_mode,
  price_total: o.price_total,
  paid: !!o.paid,
  items: o.items || [],
  updated_at: o.updated_at,
  deleted_at: o.deleted_at || null,
});

const rowToOrder = (r) => ({
  id: r.id,
  uuid: r.uuid || null,
  created_at: r.created_at,
  customer_name: r.customer_name,
  customer_contact: r.customer_contact || '',
  delivery_method: r.delivery_method || 'shipping',
  delivery_address: r.delivery_address || '',
  deadline: r.deadline || '',
  status: r.status,
  pricing_mode: r.pricing_mode,
  price_total: Number(r.price_total) || 0,
  paid: !!r.paid,
  items: Array.isArray(r.items) ? r.items : [],
  updated_at: iso(r.updated_at),
  deleted_at: iso(r.deleted_at),
});

const typeToRow = (t, userId) => ({ user_id: userId, id: t.id, name: t.name, is_active: !!t.is_active, updated_at: t.updated_at });
const rowToType = (r) => ({ id: Number(r.id), name: r.name, is_active: !!r.is_active, updated_at: iso(r.updated_at) });

async function fetchAll(sb, table) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb.from(table).select('*').order('id').range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

async function upsertChunks(sb, table, rows) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await sb.from(table).upsert(rows.slice(i, i + CHUNK), { onConflict: 'user_id,id' });
    if (error) throw error;
  }
}

/**
 * Jeden průchod synchronizace.
 *  - getLocal():  vrátí aktuální { orders, types } z aplikace
 *  - applyRemote({ orders, types, renames }): zapíše do aplikace to, co je novější na serveru
 */
export async function runSync(sb, userId, getLocal, applyRemote) {
  const [rOrders, rTypes] = await Promise.all([fetchAll(sb, 'orders'), fetchAll(sb, 'product_types')]);
  const remoteOrders = new Map(rOrders.map((r) => { const o = rowToOrder(r); return [o.id, o]; }));
  const remoteTypes = new Map(rTypes.map((r) => { const t = rowToType(r); return [t.id, t]; }));
  const local = getLocal();

  const pushOrders = [];
  const pullOrders = [];
  const renames = [];
  const numbering = [...local.orders, ...remoteOrders.values()];
  const seen = new Set();

  for (const o of local.orders) {
    seen.add(o.id);
    const r = remoteOrders.get(o.id);
    if (!r) { pushOrders.push(o); continue; }
    if (o.uuid && r.uuid && o.uuid !== r.uuid) {
      // Dvě různé zakázky dostaly na různých zařízeních stejné číslo. Zakázka s "větším" uuid dostane nové číslo,
      // takže se obě zařízení shodnou a nic se nepřepíše.
      if (o.uuid > r.uuid) {
        const newId = nextId(numbering, o.created_at);
        const renamed = { ...o, id: newId, updated_at: new Date().toISOString() };
        numbering.push(renamed);
        renames.push({ uuid: o.uuid, from: o.id, to: newId, updated_at: renamed.updated_at });
        pullOrders.push(r);
        pushOrders.push(renamed);
      } else {
        pushOrders.push(o);
      }
      continue;
    }
    const lt = ts(o.updated_at);
    const rt = ts(r.updated_at);
    if (lt > rt) pushOrders.push(o);
    else if (rt > lt) pullOrders.push(r);
  }
  for (const r of remoteOrders.values()) if (!seen.has(r.id)) pullOrders.push(r);

  const pushTypes = [];
  const pullTypes = [];
  const seenTypes = new Set();
  for (const t of local.types) {
    seenTypes.add(t.id);
    const r = remoteTypes.get(t.id);
    if (!r) { pushTypes.push(t); continue; }
    const lt = ts(t.updated_at);
    const rt = ts(r.updated_at);
    if (lt > rt) pushTypes.push(t);
    else if (rt > lt) pullTypes.push(r);
  }
  for (const r of remoteTypes.values()) if (!seenTypes.has(r.id)) pullTypes.push(r);

  if (pullOrders.length || pullTypes.length || renames.length) applyRemote({ orders: pullOrders, types: pullTypes, renames });
  await upsertChunks(sb, 'product_types', pushTypes.map((t) => typeToRow(t, userId)));
  await upsertChunks(sb, 'orders', pushOrders.map((o) => orderToRow(o, userId)));
  return { pulled: pullOrders.length + pullTypes.length, pushed: pushOrders.length + pushTypes.length };
}
