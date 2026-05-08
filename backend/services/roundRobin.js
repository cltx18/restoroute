/**
 * services/roundRobin.js
 * Picks the next active vendor in the round-robin and advances the pointer.
 *
 * Strategy:
 *   - Pull all active vendors ordered by rotation_order, id.
 *   - Use the persisted `next_vendor_index` pointer in round_robin_state.
 *   - Advance the pointer atomically inside a transaction so concurrent
 *     inbound calls don't get routed to the same vendor.
 */
const db = require('../db');

function getActiveVendors() {
  return db
    .prepare(
      'SELECT id, business_name, phone_number FROM vendors WHERE is_active = 1 ORDER BY rotation_order ASC, id ASC'
    )
    .all();
}

/**
 * Atomically pick the next vendor and advance the pointer.
 * Returns the vendor object or null if no active vendors exist.
 */
const pickNextVendor = db.transaction(() => {
  const vendors = getActiveVendors();
  if (vendors.length === 0) return null;

  const stateRow = db.prepare('SELECT next_vendor_index FROM round_robin_state WHERE id = 1').get();
  let idx = stateRow ? stateRow.next_vendor_index : 0;
  if (idx >= vendors.length) idx = 0;

  const vendor = vendors[idx];
  const nextIdx = (idx + 1) % vendors.length;

  db.prepare(
    'UPDATE round_robin_state SET next_vendor_index = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1'
  ).run(nextIdx);

  db.prepare(
    'UPDATE vendors SET last_assigned_at = CURRENT_TIMESTAMP, total_calls = total_calls + 1 WHERE id = ?'
  ).run(vendor.id);

  return vendor;
});

/**
 * Peek at the next vendor without advancing (for UI preview).
 */
function peekNextVendor() {
  const vendors = getActiveVendors();
  if (vendors.length === 0) return null;
  const stateRow = db.prepare('SELECT next_vendor_index FROM round_robin_state WHERE id = 1').get();
  let idx = stateRow ? stateRow.next_vendor_index : 0;
  if (idx >= vendors.length) idx = 0;
  return vendors[idx];
}

/**
 * Reset rotation pointer back to the start.
 */
function resetPointer() {
  db.prepare(
    'UPDATE round_robin_state SET next_vendor_index = 0, updated_at = CURRENT_TIMESTAMP WHERE id = 1'
  ).run();
}

module.exports = { pickNextVendor, peekNextVendor, getActiveVendors, resetPointer };
