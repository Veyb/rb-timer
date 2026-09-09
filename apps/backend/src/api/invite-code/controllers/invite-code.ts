import { errors, validateYupSchema, yup } from '@strapi/utils';
import { generateCode, normalizeCode } from '../../../helpers/invite-code';

const { NotFoundError, PolicyError, ValidationError, ApplicationError } = errors;

/**
 * A 403 whose message survives `createAuthorizeMiddleware`, which rewrites any
 * other `ForbiddenError` into a bare "Forbidden". Same reasoning as in the
 * community-member controller.
 */
const refuse = (message: string) => new PolicyError(message);

const INVITE_CODE_UID = 'api::invite-code.invite-code';
const REDEMPTION_UID = 'api::invite-redemption.invite-redemption';
const COMMUNITY_UID = 'api::community.community';
const USER_UID = 'plugin::users-permissions.user';
const ROLE_UID = 'plugin::users-permissions.role';

/**
 * The one answer every rejected redemption gets.
 *
 * Unknown, revoked, expired and exhausted are four different facts about a
 * code, and telling them apart tells a prober that a code exists and, by
 * implication, that some community is behind it. One string for all four, and
 * no community named in it.
 */
const INVALID_CODE = 'This invite code cannot be used.';

/** The role an invite grants. Anything above it is an officer's decision. */
const GRANTED_ROLE_TYPE = 'viewer';

// `expiresAt` is a string rather than `yup.date()` on purpose: `validateYupSchema`
// runs with `{ strict: true }`, under which yup does no coercion at all, so a
// date schema would reject every ISO string a JSON body can carry. The value is
// parsed below, where a bad one can be reported as what it is.
const createBodySchema = yup
  .object()
  .shape({
    maxUses: yup.number().integer().min(1).nullable(),
    expiresAt: yup.string().nullable(),
  })
  .noUnknown();
const validateCreateBody = validateYupSchema(createBodySchema);

// `.noUnknown()` matters here beyond tidiness: the rate limiter keyed on the
// account id stays unbypassable only while the body cannot smuggle in a field
// that some other layer might key on.
const redeemBodySchema = yup.object().shape({ code: yup.string().required() }).noUnknown();
const validateRedeemBody = validateYupSchema(redeemBodySchema);

const isExpired = (code: { expiresAt?: Date | string | null }, at: Date) =>
  code.expiresAt != null && new Date(code.expiresAt).getTime() <= at.getTime();

const isExhausted = (code: { maxUses?: number | null; usedCount?: number | null }) =>
  code.maxUses != null && (code.usedCount ?? 0) >= code.maxUses;

/**
 * What an officer is shown about a code of their own community.
 *
 * Addressed by `documentId`, like every other document in this API and like
 * Strapi's own routes. The numeric key stays in the database where it belongs.
 */
const toInviteCode = (code) => ({
  documentId: code.documentId,
  code: code.code,
  maxUses: code.maxUses ?? null,
  usedCount: code.usedCount ?? 0,
  remainingUses: code.maxUses == null ? null : Math.max(0, code.maxUses - (code.usedCount ?? 0)),
  expiresAt: code.expiresAt ?? null,
  revokedAt: code.revokedAt ?? null,
  createdAt: code.createdAt,
  issuedBy: code.issuedBy
    ? { documentId: code.issuedBy.documentId, nickname: code.issuedBy.nickname }
    : null,
  redemptions: (code.redemptions ?? []).map((redemption) => ({
    documentId: redemption.documentId,
    redeemedAt: redemption.redeemedAt,
    user: redemption.user
      ? { documentId: redemption.user.documentId, nickname: redemption.user.nickname }
      : null,
  })),
});

/**
 * Reads a code back with everything the officer view needs. One place, so the
 * create, list and revoke responses cannot drift apart in what they disclose.
 */
const readForOfficer = async (where: Record<string, unknown>) =>
  strapi.db.query(INVITE_CODE_UID).findOne({
    where,
    populate: {
      issuedBy: true,
      redemptions: { populate: { user: true } },
    },
  });

/**
 * The addressed code, if it belongs to the caller's own community.
 *
 * A code of another community answers exactly like one that does not exist —
 * the officer must not learn that it is out there, let alone act on it. Shared
 * by revoke and delete so the two cannot drift apart in what they disclose.
 */
const ownCode = async (ctx) => {
  const code = await strapi.db.query(INVITE_CODE_UID).findOne({
    where: { documentId: ctx.params.id, community: ctx.state.user.community.id },
  });

  if (!code) {
    throw new NotFoundError('Invite code not found');
  }

  return code;
};

/**
 * A code nobody holds yet.
 *
 * ~59 bits makes a collision a curiosity rather than a risk, but the column is
 * unique and a collision would otherwise surface as a constraint violation in
 * the officer's face, so the loop turns it into a retry.
 */
const allocateCode = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateCode();
    const taken = await strapi.db.query(INVITE_CODE_UID).findOne({ where: { code } });

    if (!taken) return code;
  }

  throw new ApplicationError('Could not allocate an unused invite code');
};

export default {
  /**
   * Issues a code for the officer's own community.
   *
   * The community comes from `ctx.state.user`; the body carries the use limit
   * and the expiry and nothing else, so a request naming another community has
   * nothing to name it with.
   */
  async create(ctx) {
    const { maxUses = null, expiresAt = null } = await validateCreateBody(ctx.request.body ?? {});

    let expiry: Date | null = null;

    if (expiresAt != null) {
      expiry = new Date(expiresAt);

      if (Number.isNaN(expiry.getTime())) {
        throw new ValidationError('expiresAt must be a date');
      }

      if (expiry.getTime() <= Date.now()) {
        throw new ValidationError('expiresAt must be in the future');
      }
    }

    const created = await strapi.documents(INVITE_CODE_UID).create({
      data: {
        code: await allocateCode(),
        community: ctx.state.user.community.id,
        issuedBy: ctx.state.user.id,
        maxUses,
        expiresAt: expiry,
        usedCount: 0,
      },
    });

    ctx.body = toInviteCode(await readForOfficer({ documentId: created.documentId }));
  },

  /**
   * The codes of the officer's own community.
   *
   * The community is the `where` clause itself, exactly as in the member API —
   * no client parameter is merged into it, so no filter can widen the result.
   */
  async find(ctx) {
    const codes = await strapi.db.query(INVITE_CODE_UID).findMany({
      where: { community: ctx.state.user.community.id },
      populate: {
        issuedBy: true,
        redemptions: { populate: { user: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    ctx.body = codes.map(toInviteCode);
  },

  /**
   * Revokes a code of the officer's own community.
   *
   * Stamping is the only ending this API offers. There is deliberately no
   * delete: a code and the redemptions hanging off it are the community's
   * record of who admitted whom, and an officer who could erase that could
   * invite whoever they liked and leave nothing behind — not even a trace of
   * which account issued the code. Removing a row is an operator's act, from
   * the admin panel, and even then the redemption records survive it on their
   * own (see the snapshot fields on `invite-redemption`).
   */
  async revoke(ctx) {
    const code = await ownCode(ctx);

    if (!code.revokedAt) {
      await strapi.documents(INVITE_CODE_UID).update({
        documentId: code.documentId,
        data: { revokedAt: new Date() },
      });
    }

    ctx.body = toInviteCode(await readForOfficer({ id: code.id }));
  },

  /**
   * Redeems a code: joins the caller to its community as a `viewer`.
   *
   * The check and the increment run in one transaction over a locked row, so
   * two callers racing for the last use of a code cannot both read the same
   * `usedCount` and both pass.
   */
  async redeem(ctx) {
    const { code: submitted } = await validateRedeemBody(ctx.request.body ?? {});
    const { user } = ctx.state;

    if (user.community) {
      // Deliberately a different message from `INVALID_CODE`: this says nothing
      // about the code, only about the caller, who already knows their own
      // membership. Leaving first is the way to move.
      throw refuse(
        'You already belong to a community. Leave it before redeeming another invite code.',
      );
    }

    const normalized = normalizeCode(submitted);

    // A malformed submission never reaches the database, but it still answers
    // like a wrong one — "that is not the shape of a code" would confirm the
    // shape to someone still working it out.
    if (!normalized) {
      throw refuse(INVALID_CODE);
    }

    const grantedRole = await strapi.db
      .query(ROLE_UID)
      .findOne({ where: { type: GRANTED_ROLE_TYPE } });

    if (!grantedRole) {
      throw new ApplicationError(`No "${GRANTED_ROLE_TYPE}" role to grant`);
    }

    // Read from the model metadata rather than repeating the schema's
    // `collectionName`, so a rename cannot leave the lock below pointed at a
    // table that no longer exists — or, worse, at one that still does.
    const inviteCodeTable = strapi.db.metadata.get(INVITE_CODE_UID).tableName;

    const communityId = await strapi.db.transaction(async ({ trx }) => {
      // The lock, and the only reason one statement here goes through knex:
      // the query engine has no `forUpdate`. On PostgreSQL this holds the row
      // until the transaction ends, so a second redemption of the same code
      // waits here and then reads the incremented counter. On SQLite the
      // clause compiles to nothing, which costs that driver nothing — it
      // serialises writers outright — and is why the concurrency test for this
      // endpoint runs against PostgreSQL instead of the suite's harness.
      const locked = await strapi.db
        .connection(inviteCodeTable)
        .transacting(trx)
        .where({ code: normalized })
        .forUpdate()
        .first();

      if (!locked) return null;

      // Read back through the query engine now the row is held: it maps the
      // columns and resolves the community relation, and everything it sees is
      // inside the transaction.
      const inviteCode = await strapi.db.query(INVITE_CODE_UID).findOne({
        where: { id: locked.id },
        populate: { community: true, issuedBy: true },
      });

      if (!inviteCode?.community) return null;

      const issuedBy = inviteCode.issuedBy;

      if (inviteCode.revokedAt) return null;
      if (isExpired(inviteCode, new Date())) return null;
      if (isExhausted(inviteCode)) return null;

      await strapi.documents(INVITE_CODE_UID).update({
        documentId: inviteCode.documentId,
        data: { usedCount: (inviteCode.usedCount ?? 0) + 1 },
      });

      // The role is fixed at `viewer` here rather than read from the request.
      // The body schema has no role field to begin with, so a request naming
      // one is already refused; this is the second of the two.
      await strapi.db.query(USER_UID).update({
        where: { id: user.id },
        data: { community: inviteCode.community.id, role: grantedRole.id },
      });

      // Written with a snapshot beside the relations, so the record still says
      // who admitted whom after a code is deleted or an account removes itself.
      await strapi.documents(REDEMPTION_UID).create({
        data: {
          community: inviteCode.community.id,
          inviteCode: inviteCode.id,
          user: user.id,
          redeemedAt: new Date(),
          codeValue: inviteCode.code,
          issuedByUsername: issuedBy?.username ?? null,
          redeemedByUsername: user.username,
        },
      });

      return inviteCode.community.id;
    });

    if (communityId == null) {
      throw refuse(INVALID_CODE);
    }

    const community = await strapi.db.query(COMMUNITY_UID).findOne({ where: { id: communityId } });

    ctx.body = {
      redeemed: true,
      community: community
        ? { documentId: community.documentId, name: community.name, server: community.server }
        : null,
      role: { name: grantedRole.name, type: grantedRole.type },
    };
  },
};
