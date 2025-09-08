// Qui peut PARLER au joueur (répondre dans les salons DM)
const TALK_ROLES = [
  process.env.HELPER_ROLE_ID,
  process.env.MODO_ROLE_ID,
  process.env.ADMIN_ROLE_ID,
  process.env.SUPADMIN_ROLE_ID,
  process.env.DEV_ROLE_ID,
  process.env.REFSTAFF_ROLE_ID,
  process.env.CONSEILLER_ROLE_ID,
  process.env.COFONDA_ROLE_ID,
  process.env.FONDA_ROLE_ID,
].filter(Boolean);

// Qui peut SUPPRIMER un ticket (en plus de close)
const DELETE_ROLES = [
  process.env.ADMIN_ROLE_ID,
  process.env.SUPADMIN_ROLE_ID,
  process.env.DEV_ROLE_ID,
  process.env.REFSTAFF_ROLE_ID,
  process.env.CONSEILLER_ROLE_ID,
  process.env.COFONDA_ROLE_ID,
  process.env.FONDA_ROLE_ID,
].filter(Boolean);

function memberHasAnyRole(member, roleIds) {
  if (!member) return false;
  return member.roles.cache.some(r => roleIds.includes(r.id));
}

module.exports = { TALK_ROLES, DELETE_ROLES, memberHasAnyRole };
