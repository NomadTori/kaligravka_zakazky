import { addDays, newUuid, nowISO, todayISO, uid } from './utils';

// Výchozí číselník, ukázkové zakázky a pomocné funkce pro formulář.
export function makeDemoOrders() {
  const it = (order_id, product_type_id, inscription, quantity, unit_price) => ({ id: uid(), order_id, product_type_id, inscription, quantity, unit_price });
  const mk = (id, o, items) => ({ id, delivery_method: 'shipping', paid: false, ...o, items: items.map((i) => it(id, ...i)) });
  const PAID = ['#2026-001', '#2026-002', '#2026-003', '#2026-005', '#2026-009'];
  const orders = [
    mk('#2026-001', { created_at: addDays(-110), customer_name: 'Karel Beneš', customer_contact: '+420 603 000 111', delivery_method: 'pickup', delivery_address: '', deadline: addDays(-100), status: 'Odevzdáno', pricing_mode: 'per_item', price_total: 880 },
      [[2, 'K & B – 25 let spolu', 4, 110], [1, 'Karel', 1, 440]]),
    mk('#2026-002', { created_at: addDays(-75), customer_name: 'Hana Veselá', customer_contact: 'hana.vesela@email.example', delivery_address: 'Lipová 12, 779 00 Olomouc', deadline: addDays(-66), status: 'Odesláno', pricing_mode: 'per_item', price_total: 2300 },
      [[4, 'Svatební dar', 2, 650], [2, 'H & J', 4, 250]]),
    mk('#2026-003', { created_at: addDays(-45), customer_name: 'Jana Dvořáková', customer_contact: '+420 602 111 222', delivery_address: 'Nádražní 14, 702 00 Ostrava', deadline: addDays(-38), status: 'Odesláno', pricing_mode: 'per_item', price_total: 1170 },
      [[2, 'Svatba Petr & Eva, 14. 6.', 6, 120], [4, 'P & E', 1, 450]]),
    mk('#2026-004', { created_at: addDays(-33), customer_name: 'Pivovar U Kata', customer_contact: 'objednavky@ukata.example', delivery_address: 'Hlavní 8, 739 61 Třinec', deadline: addDays(-25), status: 'Odesláno', pricing_mode: 'total_manual', price_total: 4200 },
      [[3, 'U Kata – od roku 1894', 12, 0]]),
    mk('#2026-005', { created_at: addDays(-20), customer_name: 'Ondřej Pavlík', customer_contact: '+420 775 123 456', delivery_method: 'pickup', delivery_address: '', deadline: addDays(-15), status: 'Odevzdáno', pricing_mode: 'per_item', price_total: 600 },
      [[3, 'Ondra', 2, 300]]),
    mk('#2026-006', { created_at: addDays(-14), customer_name: 'Marie Babičková', customer_contact: 'marie.babickova@seznam.example', delivery_address: 'Zahradní 3, 748 01 Hlučín', deadline: addDays(-8), status: 'Odesláno', pricing_mode: 'per_item', price_total: 500 },
      [[1, 'Pro vnoučata', 2, 250]]),
    mk('#2026-007', { created_at: addDays(-9), customer_name: 'Lucie Marková', customer_contact: '+420 608 222 333', delivery_address: 'Revoluční 9, 702 00 Ostrava', deadline: addDays(-2), status: 'Stornováno', pricing_mode: 'per_item', price_total: 750 },
      [[1, 'Pro maminku', 3, 250]]),
    mk('#2026-008', { created_at: addDays(-6), customer_name: 'Tomáš Král', customer_contact: '+420 777 333 444', delivery_address: 'Střelniční 21, 702 00 Ostrava', deadline: addDays(2), status: 'Hotovo', pricing_mode: 'per_item', price_total: 690 },
      [[1, 'Nejlepší babička, k 70. narozeninám', 1, 250], [2, 'Rodina Králova', 4, 110]]),
    mk('#2026-009', { created_at: addDays(-3), customer_name: 'Petra Svobodová', customer_contact: 'petra.svobodova@email.example', delivery_method: 'pickup', delivery_address: '', deadline: addDays(0), status: 'Přijato', pricing_mode: 'total_manual', price_total: 1600 },
      [[4, 'Monogram P. S.', 1, 0], [2, 'Monogram P. S.', 6, 0]]),
    mk('#2026-010', { created_at: addDays(-2), customer_name: 'Martin Holub', customer_contact: '+420 724 555 666', delivery_address: 'Dukelská 77, 735 06 Karviná', deadline: addDays(9), status: 'Přijato', pricing_mode: 'per_item', price_total: 640 },
      [[3, 'Dědovi k 80. narozeninám', 2, 320]]),
    mk('#2026-011', { created_at: addDays(-1), customer_name: 'Eva Nováková', customer_contact: '+420 731 888 999', delivery_address: 'Dlouhá 4, 702 00 Ostrava', deadline: '', status: 'Přijato', pricing_mode: 'per_item', price_total: 300 },
      [[2, 'Eva & Jakub', 2, 150]]),
  ];
  const stamp = nowISO();
  return orders.map((o) => {
    const id = o.id.replace('#2026-', '#DEMO-');
    return { ...o, id, uuid: newUuid(), paid: PAID.includes(o.id), updated_at: stamp, deleted_at: null, items: o.items.map((i) => ({ ...i, order_id: id })) };
  });
}
export const defaultPrefs = () => ({ viewActive: 'tiles', viewArchive: 'tiles', sortActive: 'deadline', sortArchive: 'newest' });



export const blankItem = (types) => ({ id: uid(), product_type_id: (types.find((t) => t.is_active) || {}).id ?? '', inscription: '', quantity: '1', unit_price: '' });
export const newDraftFor = (types) => ({ id: null, created_at: todayISO(), customer_name: '', customer_contact: '', delivery_method: 'shipping', delivery_address: '', deadline: '', status: 'Přijato', paid: false, pricing_mode: 'per_item', price_manual: '', items: [blankItem(types)] });
export const draftFromOrder = (o) => ({
  id: o.id, created_at: o.created_at, customer_name: o.customer_name, customer_contact: o.customer_contact,
  delivery_method: o.delivery_method || 'shipping', delivery_address: o.delivery_address, deadline: o.deadline || '', status: o.status, paid: !!o.paid, pricing_mode: o.pricing_mode,
  price_manual: o.pricing_mode === 'total_manual' ? String(o.price_total) : '',
  items: o.items.map((i) => ({ id: i.id, product_type_id: i.product_type_id, inscription: i.inscription, quantity: String(i.quantity), unit_price: i.unit_price ? String(i.unit_price) : '' })),
});
export const nextId = (orders, created) => {
  const y = created.slice(0, 4);
  const nums = orders.filter((o) => o.id.startsWith(`#${y}-`)).map((o) => parseInt(o.id.split('-')[1], 10) || 0);
  return `#${y}-${String(Math.max(0, ...nums) + 1).padStart(3, '0')}`;
};


const EPOCH = '1970-01-01T00:00:00.000Z';
export const DEFAULT_TYPE_NAMES = ['Baňka', 'Sklenice', 'Krýgl', 'Karafa'];
export const defaultTypes = () => DEFAULT_TYPE_NAMES.map((name, i) => ({ id: i + 1, name, is_active: true, updated_at: EPOCH }));
