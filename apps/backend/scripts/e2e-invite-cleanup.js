// Removes the invite codes an e2e run issued, and the redemption records that
// go with them.
//
// A script rather than an API call, because the API deliberately has no way to
// delete a code: an officer who could remove one could invite whoever they
// liked and leave nothing behind, not even a trace of which account issued it.
// Tidying up after a test run is an operator's job, and this is the operator's
// hands.
//
// Scoped to codes issued by one named account — the fixture officer. Seed data
// and anything a developer made under their own account is issued by somebody
// else and is never touched. The one thing to know: a code you create yourself
// while signed in *as the fixture officer* looks exactly like a test code and
// will be removed.
//
// Talks to the database directly, like scripts/e2e-fixture.js and for the same
// reasons: booting Strapi would add seconds to a run, and it reads the same
// `.env` the app does so it follows the app's database rather than hardcoding
// one.
//
// Usage:
//   node scripts/e2e-invite-cleanup.js <issuer-email>

const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

const [issuerEmail] = process.argv.slice(2);

if (!issuerEmail) {
  console.error('Usage: node scripts/e2e-invite-cleanup.js <issuer-email>');
  process.exit(1);
}

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
    `e2e-invite-cleanup: expected DATABASE_CLIENT=postgres, got "${env.DATABASE_CLIENT || 'sqlite'}".`,
  );
  process.exit(1);
}

const main = async () => {
  const client = new Client({
    host: env.DATABASE_HOST || 'localhost',
    port: Number(env.DATABASE_PORT || 5432),
    database: env.DATABASE_NAME,
    user: env.DATABASE_USERNAME,
    password: env.DATABASE_PASSWORD,
  });

  await client.connect();

  try {
    const { rows: users } = await client.query('SELECT id FROM up_users WHERE email = $1', [
      issuerEmail,
    ]);

    if (users.length === 0) {
      // Nothing to clean up rather than an error: a run that never got as far
      // as registering the fixture has nothing to leave behind either.
      console.info(`e2e-invite-cleanup: no account for ${issuerEmail}; nothing to do`);
      return;
    }

    const issuerId = users[0].id;

    const { rows: codes } = await client.query(
      `SELECT c.id
         FROM invite_codes c
         JOIN invite_codes_issued_by_lnk l ON l.invite_code_id = c.id
        WHERE l.user_id = $1`,
      [issuerId],
    );

    if (codes.length === 0) {
      console.info('e2e-invite-cleanup: no codes to remove');
      return;
    }

    const ids = codes.map((row) => row.id);

    await client.query('BEGIN');

    // The redemption rows first: they are what the code's link tables point at,
    // and leaving them would leave records of admissions into a community by a
    // code that no longer exists — meaningful in production, noise here.
    const { rows: redemptions } = await client.query(
      `SELECT r.id
         FROM invite_redemptions r
         JOIN invite_redemptions_invite_code_lnk l ON l.invite_redemption_id = r.id
        WHERE l.invite_code_id = ANY($1::int[])`,
      [ids],
    );
    const redemptionIds = redemptions.map((row) => row.id);

    if (redemptionIds.length > 0) {
      await client.query(
        'DELETE FROM invite_redemptions_user_lnk WHERE invite_redemption_id = ANY($1::int[])',
        [redemptionIds],
      );
      await client.query(
        'DELETE FROM invite_redemptions_invite_code_lnk WHERE invite_redemption_id = ANY($1::int[])',
        [redemptionIds],
      );
      await client.query(
        'DELETE FROM invite_redemptions_community_lnk WHERE invite_redemption_id = ANY($1::int[])',
        [redemptionIds],
      );
      await client.query('DELETE FROM invite_redemptions WHERE id = ANY($1::int[])', [
        redemptionIds,
      ]);
    }

    await client.query(
      'DELETE FROM invite_codes_community_lnk WHERE invite_code_id = ANY($1::int[])',
      [ids],
    );
    await client.query(
      'DELETE FROM invite_codes_issued_by_lnk WHERE invite_code_id = ANY($1::int[])',
      [ids],
    );
    await client.query('DELETE FROM invite_codes WHERE id = ANY($1::int[])', [ids]);

    await client.query('COMMIT');

    console.info(
      `e2e-invite-cleanup: removed ${ids.length} code(s) and ${redemptionIds.length} redemption(s) issued by ${issuerEmail}`,
    );
  } finally {
    await client.end();
  }
};

main().catch((error) => {
  console.error(`e2e-invite-cleanup: ${error.message}`);
  process.exit(1);
});
