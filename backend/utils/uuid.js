/* ═══════════════════════════════════════════════════════
   UUID Generation Helper
   Compatible with both PostgreSQL and SQLite
   ═══════════════════════════════════════════════════════ */

import { v4 as uuidv4 } from 'uuid';

// Generate UUID compatible with both databases
export function generateId() {
  return uuidv4();
}

export default generateId;
