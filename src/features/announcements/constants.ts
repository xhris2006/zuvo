/**
 * Cookie de l'annonce masquée par le visiteur. Défini hors du composant
 * client : une valeur exportée par un module « use client » n'est, côté
 * serveur, qu'une référence (le cookie ne serait jamais lu).
 */
export const HIDDEN_ANNOUNCEMENT_COOKIE = "zuvo_hidden_announcement";
