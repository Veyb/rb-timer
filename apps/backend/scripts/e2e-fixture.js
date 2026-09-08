// Puts one e2e-fixture user into a given state, because neither of the two
// things the access gate looks at is settable through a public self-service
// API:
//
//   * the users-permissions role, and
//   * membership of a community.
//
// Both are set independently so the suite can cover each corner of the gate:
// a full member, a user with a role but no community, and a member still on
// the role registration grants.
//
// Talks to the database directly rather than through Strapi: booting an
// instance per fixture would add seconds to every suite run, and the three
// statements below are the whole job. It reads the same `.env` the app does,
// so it follows the app's database rather than hardcoding one.
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
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

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

/**
 * Minimal `.env` reader. Strapi loads the file itself at boot, but a plain
 * script does not, and `dotenv` is only a transitive dependency here.
 */
const readEnvFile = () => {
  const file = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(file)) return {};

  return Object.fromEntries(
    fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const at = line.indexOf('=');
        return [line.slice(0, at), line.slice(at + 1).replace(/^["']|["']$/g, '')];
      }),
  );
};

const env = { ...readEnvFile(), ...process.env };

if ((env.DATABASE_CLIENT || 'sqlite') !== 'postgres') {
  console.error(
    `e2e-fixture: expected DATABASE_CLIENT=postgres, got "${env.DATABASE_CLIENT || 'sqlite'}".\n` +
      'This script was rewritten for PostgreSQL; it no longer speaks SQLite.',
  );
  process.exit(1);
}

// Strapi generates one per document; any unique string does for a fixture row.
const documentId = () => crypto.randomBytes(12).toString('hex');

const main = async () => {
  const client = new Client({
    host: env.DATABASE_HOST || 'localhost',
    port: Number(env.DATABASE_PORT || 5432),
    database: env.DATABASE_NAME,
    user: env.DATABASE_USERNAME,
    password: env.DATABASE_PASSWORD,
  });

  await client.connect();

  const changes = [];

  try {
    const { rows: users } = await client.query('SELECT id FROM up_users WHERE email = $1', [email]);
    if (users.length === 0) {
      throw new Error(`no up_users row for email ${email}`);
    }
    const userId = users[0].id;

    const { rows: roles } = await client.query('SELECT id FROM up_roles WHERE type = $1', [
      roleType,
    ]);
    if (roles.length === 0) {
      throw new Error(`no role with type "${roleType}"`);
    }
    const roleId = roles[0].id;

    const { rows: currentRole } = await client.query(
      'SELECT role_id FROM up_users_role_lnk WHERE user_id = $1',
      [userId],
    );

    if (currentRole[0]?.role_id !== roleId) {
      await client.query('BEGIN');
      await client.query('DELETE FROM up_users_role_lnk WHERE user_id = $1', [userId]);
      await client.query('INSERT INTO up_users_role_lnk (user_id, role_id) VALUES ($1, $2)', [
        userId,
        roleId,
      ]);
      await client.query('COMMIT');
      changes.push(`role -> ${roleType}`);
    }

    const { rows: currentCommunity } = await client.query(
      'SELECT community_id FROM up_users_community_lnk WHERE user_id = $1',
      [userId],
    );

    if (!wantsCommunity) {
      if (currentCommunity.length > 0) {
        await client.query('DELETE FROM up_users_community_lnk WHERE user_id = $1', [userId]);
        changes.push('community -> none');
      }
    } else {
      // The bootstrap seeder only moves users who already had a role above the
      // default one, and it records that it ran; a fixture registered
      // afterwards would never be picked up. So the community is ensured here.
      let { rows: community } = await client.query('SELECT id FROM communities WHERE name = $1', [
        communityName,
      ]);

      if (community.length === 0) {
        ({ rows: community } = await client.query(
          `INSERT INTO communities (document_id, name, server, created_at, updated_at, published_at)
           VALUES ($1, $2, $3, now(), now(), now())
           RETURNING id`,
          [documentId(), communityName, COMMUNITY_SERVER],
        ));
        changes.push(`created community "${communityName}"`);
      }

      const communityId = community[0].id;

      if (currentCommunity[0]?.community_id !== communityId) {
        await client.query('BEGIN');
        await client.query('DELETE FROM up_users_community_lnk WHERE user_id = $1', [userId]);
        await client.query(
          'INSERT INTO up_users_community_lnk (user_id, community_id) VALUES ($1, $2)',
          [userId, communityId],
        );
        await client.query('COMMIT');
        changes.push(`community -> "${communityName}"`);
      }
    }
  } finally {
    await client.end();
  }

  console.info(
    changes.length > 0 ? `e2e-fixture: ${changes.join('; ')}` : 'e2e-fixture: already prepared',
  );
};

main().catch((error) => {
  console.error(`e2e-fixture: ${error.message}`);
  process.exit(1);
});
