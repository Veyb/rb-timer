/**
 * The record of how people got into a community.
 *
 * Its own endpoint rather than a field on the invite-code list, because the
 * two answer different questions. The code list asks "what can still be used";
 * this asks "who was admitted, when, and on whose invitation" — and it has to
 * keep answering after a code is gone, which a list built from codes cannot do.
 */

const REDEMPTION_UID = 'api::invite-redemption.invite-redemption';

/**
 * What an officer is shown about one admission.
 *
 * The snapshot fields lead and the relations follow. That order is the point:
 * `codeValue`, `issuedByUsername` and `redeemedByUsername` were copied when the
 * admission happened and cannot be edited or broken afterwards, while
 * `inviteCode` and `user` are live and may be null — a code an operator deleted,
 * an account that deleted itself. A reader gets the account's current nickname
 * where there still is one, and the name as it stood either way.
 *
 * No e-mail addresses, in keeping with the member API: an officer administers
 * their community, they do not get a contact list out of it.
 */
const toRedemption = (redemption) => ({
  documentId: redemption.documentId,
  redeemedAt: redemption.redeemedAt,
  code: redemption.codeValue,
  issuedByUsername: redemption.issuedByUsername ?? null,
  redeemedByUsername: redemption.redeemedByUsername,
  // Null once the code is gone; the reader still sees `code` above.
  inviteCodeDocumentId: redemption.inviteCode?.documentId ?? null,
  codeRevokedAt: redemption.inviteCode?.revokedAt ?? null,
  // Null once the account is gone, which is exactly what the snapshot covers.
  user: redemption.user
    ? { documentId: redemption.user.documentId, nickname: redemption.user.nickname }
    : null,
});

export default {
  /**
   * Every admission into the caller's own community, newest first.
   *
   * The community is the `where` clause itself, taken from `ctx.state.user` —
   * no client parameter is merged into it, exactly as in the member and
   * invite-code endpoints. A redemption of another community is outside the
   * clause by construction, not by a filter that could be widened.
   */
  async find(ctx) {
    const redemptions = await strapi.db.query(REDEMPTION_UID).findMany({
      where: { community: ctx.state.user.community.id },
      populate: { inviteCode: true, user: true },
      orderBy: { redeemedAt: 'desc' },
    });

    ctx.body = redemptions.map(toRedemption);
  },
};
