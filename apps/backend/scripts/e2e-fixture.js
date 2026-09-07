// Puts one e2e-fixture user into a given state directly in
// apps/backend/.tmp/data.db, because neither of the two things the access gate
// looks at is settable through a public self-service API:
//
//   * the users-permissions role, and
//   * membership of a community.
//
// Both are set independently so the suite can cover each corner of the gate:
// a full member, a user with a role but no community, and a member still on
// the role registration grants.
//
// Scoped strictly to the email passed on the command line; never touches any
// other user. Idempotent: a no-op once the user is already in the asked-for
// state.
//
// Usage:
//   node scripts/e2e-fixture.js <email> [--role=<type>] [--community=<name|none>]
//
// Defaults to --role=officer --community="E2E Fixture Community".

const crypto = require('node:crypto');
const path = require('node:path');
const Database = require('better-sqlite3');

const DEFAULT_COMMUNITY_NAME = 'E2E Fixture Community';
const COMMUNITY_SERVER = 'Black';

const [email, ...flags] = process.argv.slice(2);

if (!email) {
  console.error(
    'Usage: node scripts/e2e-fixture.js <email> [--role=<type>] [--community=<name|none>]',
  );
  process.exit(1);
}

const flagValue = (name, fallback) => {
  const match = flags.find((flag) => flag.startsWith(`--${name}=`));
  return match ? match.slice(name.length + 3) : fallback;
};

const roleType = flagValue('role', 'officer');
const communityName = flagValue('community', DEFAULT_COMMUNITY_NAME);
const wantsCommunity = communityName !== 'none';

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

// Strapi generates one per document; any unique string does for a fixture row.
const documentId = () => crypto.randomBytes(12).toString('hex');

try {
  const user = db.prepare('SELECT id FROM up_users WHERE email = ?').get(email);
  if (!user) {
    console.error(`e2e-fixture: no up_users row for email ${email}`);
    process.exit(1);
  }

  const role = db.prepare('SELECT id FROM up_roles WHERE type = ?').get(roleType);
  if (!role) {
    console.error(`e2e-fixture: no role with type "${roleType}" found`);
    process.exit(1);
  }

  const changes = [];

  const currentRole = db
    .prepare('SELECT role_id FROM up_users_role_lnk WHERE user_id = ?')
    .get(user.id);

  if (currentRole?.role_id !== role.id) {
    withRetry(() => {
      db.transaction(() => {
        db.prepare('DELETE FROM up_users_role_lnk WHERE user_id = ?').run(user.id);
        db.prepare('INSERT INTO up_users_role_lnk (user_id, role_id) VALUES (?, ?)').run(
          user.id,
          role.id,
        );
      })();
    });
    changes.push(`role -> ${roleType}`);
  }

  const currentCommunity = db
    .prepare('SELECT community_id FROM up_users_community_lnk WHERE user_id = ?')
    .get(user.id);

  if (!wantsCommunity) {
    if (currentCommunity) {
      withRetry(() => {
        db.prepare('DELETE FROM up_users_community_lnk WHERE user_id = ?').run(user.id);
      });
      changes.push('community -> none');
    }
  } else {
    // The bootstrap seeder only moves users who already had a role above the
    // default one, and it records that it ran; a fixture registered afterwards
    // would never be picked up. So the community is ensured here instead.
    let community = db.prepare('SELECT id FROM communities WHERE name = ?').get(communityName);

    if (!community) {
      const now = new Date().toISOString();
      withRetry(() => {
        db.prepare(
          `INSERT INTO communities (document_id, name, server, created_at, updated_at, published_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        ).run(documentId(), communityName, COMMUNITY_SERVER, now, now, now);
      });
      community = db.prepare('SELECT id FROM communities WHERE name = ?').get(communityName);
      changes.push(`created community "${communityName}"`);
    }

    if (currentCommunity?.community_id !== community.id) {
      withRetry(() => {
        db.transaction(() => {
          db.prepare('DELETE FROM up_users_community_lnk WHERE user_id = ?').run(user.id);
          db.prepare(
            'INSERT INTO up_users_community_lnk (user_id, community_id) VALUES (?, ?)',
          ).run(user.id, community.id);
        })();
      });
      changes.push(`community -> "${communityName}"`);
    }
  }

  console.info(
    changes.length > 0 ? `e2e-fixture: ${changes.join('; ')}` : 'e2e-fixture: already prepared',
  );
} finally {
  db.close();
}
