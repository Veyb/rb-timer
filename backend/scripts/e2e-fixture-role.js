// Upgrades a single e2e-fixture user to the "officer" role directly in
// backend/.tmp/data.db, so the Playwright suite (frontend/e2e/) can reach
// every role-gated screen without a public self-service "change my role" API.
// Scoped strictly to the email passed on the command line — never touches
// any other row. Idempotent: a no-op if the user is already an officer.
//
// Usage: node scripts/e2e-fixture-role.js <email>

const path = require('node:path');
const Database = require('better-sqlite3');

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/e2e-fixture-role.js <email>');
  process.exit(1);
}

const dbPath = path.join(__dirname, '..', '.tmp', 'data.db');
const db = new Database(dbPath);

function withRetry(fn, attempts = 5, delayMs = 75) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return fn();
    } catch (error) {
      const isLocked = /database is locked|SQLITE_BUSY/i.test(error.message || '');
      if (!isLocked || attempt === attempts) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs);
    }
  }
}

try {
  const user = db
    .prepare('SELECT id FROM up_users WHERE email = ?')
    .get(email);
  if (!user) {
    console.error(`e2e-fixture-role: no up_users row for email ${email}`);
    process.exit(1);
  }

  const officerRole = db
    .prepare("SELECT id FROM up_roles WHERE type = 'officer'")
    .get();
  if (!officerRole) {
    console.error('e2e-fixture-role: no role with type "officer" found');
    process.exit(1);
  }

  const currentLink = db
    .prepare('SELECT role_id FROM up_users_role_lnk WHERE user_id = ?')
    .get(user.id);

  if (currentLink && currentLink.role_id === officerRole.id) {
    console.log('e2e-fixture-role: already officer, no changes made');
    process.exit(0);
  }

  withRetry(() => {
    const upgrade = db.transaction(() => {
      db.prepare('DELETE FROM up_users_role_lnk WHERE user_id = ?').run(user.id);
      db.prepare(
        'INSERT INTO up_users_role_lnk (user_id, role_id) VALUES (?, ?)'
      ).run(user.id, officerRole.id);
    });
    upgrade();
  });

  console.log('e2e-fixture-role: upgraded to officer');
} finally {
  db.close();
}
