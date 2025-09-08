// src/utils/perms.js
// Centralise tous les rôles et helpers de permissions.

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

// Rôles autorisés à SUPPRIMER les tickets
const DELETE_ROLES = [
  process.env.ADMIN_ROLE_ID,
  process.env.SUPADMIN_ROLE_ID,
  process.env.DEV_ROLE_ID,
  process.env.REFSTAFF_ROLE_ID,
  process.env.CONSEILLER_ROLE_ID,
  process.env.COFONDA_ROLE_ID,
  process.env.FONDA_ROLE_ID,
].filter(Boolean);

// Rôles autorisés aux COMMANDES DE MODÉRATION
const MOD_ROLES = [
  process.env.ADMIN_ROLE_ID,
  process.env.SUPADMIN_ROLE_ID,
  process.env.DEV_ROLE_ID,
  process.env.REFSTAFF_ROLE_ID,
  process.env.CONSEILLER_ROLE_ID,
  process.env.COFONDA_ROLE_ID,
  process.env.FONDA_ROLE_ID,
].filter(Boolean);

/**
 * Retourne true si le membre possède AU MOINS un des rôles donnés.
 */
function memberHasAnyRole(member, roleIds) {
  try {
    return !!member?.roles?.cache?.some(r => roleIds.includes(r.id));
  } catch {
    return false;
  }
}

/**
 * True si le membre est autorisé à utiliser les commandes de modération.
 */
function isMod(member) {
  return memberHasAnyRole(member, MOD_ROLES);
}

/**
 * Vérifie si LE BOT peut agir sur la cible (hiérarchie de rôles).
 * - Le bot doit avoir un rôle STRICTEMENT au-dessus de la cible.
 * - On interdit aussi d'agir sur le bot lui-même.
 */
function botCanActOn(targetMember, guild) {
  try {
    const me = guild?.members?.me;
    if (!targetMember || !me) return false;
    if (targetMember.id === me.id) return false;
    // comparePositionTo > 0 => le rôle le plus haut du bot est au-dessus de la cible
    return me.roles.highest.comparePositionTo(targetMember.roles.highest) > 0;
  } catch {
    return false;
  }
}

module.exports = {
  TALK_ROLES,
  DELETE_ROLES,
  MOD_ROLES,
  memberHasAnyRole,
  isMod,
  botCanActOn,
};
