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

const DELETE_ROLES = [
  process.env.ADMIN_ROLE_ID,
  process.env.SUPADMIN_ROLE_ID,
  process.env.DEV_ROLE_ID,
  process.env.REFSTAFF_ROLE_ID,
  process.env.CONSEILLER_ROLE_ID,
  process.env.COFONDA_ROLE_ID,
  process.env.FONDA_ROLE_ID,
].filter(Boolean);

// —— Rôles autorisés aux commandes de MODÉRATION
const MOD_ROLES = [
  process.env.ADMIN_ROLE_ID,
  process.env.SUPADMIN_ROLE_ID,
  process.env.DEV_ROLE_ID,
  process.env.REFSTAFF_ROLE_ID,
  process.env.CONSEILLER_ROLE_ID,
  process.env.COFONDA_ROLE_ID,
  process.env.FONDA_ROLE_ID,
].filter(Boolean);

function memberHasAnyRole(member, roleIds) {
  return !!member?.roles?.cache?.some(r => roleIds.includes(r.id));
}

function isMod(member) {
  return memberHasAnyRole(member, MOD_ROLES);
}

module.exports = { TALK_ROLES, DELETE_ROLES, MOD_ROLES, memberHasAnyRole, isMod };
