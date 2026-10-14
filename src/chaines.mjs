// Chaînes WhatsApp et Telegram : récap quotidien de TOUS les mouvements du
// jour, identique pour tous les abonnés (diffusion) — contrairement aux
// alertes email, personnalisées par abonnement.
// Sans dépendance, pour rester testable (node --test).

export const SITE = "https://www.dataparl.fr";
export const MAX_LIGNES_CHAINE = 30;

const CHAMBRE_LONG = { assemblee: "Assemblée nationale", senat: "Sénat", europarl: "Parlement européen" };
const CHAMBRES = ["assemblee", "senat", "europarl"];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

// Regroupement par type (arrivées, départs, transferts), puis par chambre.
const TYPES = ["arrivee", "depart", "transfert"];
const TITRE = { arrivee: "Arrivées", depart: "Départs", transfert: "Transferts" };
const EMOJI = { arrivee: "➕", depart: "➖", transfert: "🔁" };
const ENTETE = { arrivee: "✅", depart: "🚪", transfert: "🔁" };

export function dateLongue(jour) {
  const [a, m, j] = jour.split("-").map(Number);
  return `${j} ${MOIS[m - 1]} ${a}`;
}

// Lien tracé vers l'édition du jour — code « daily-tm » du système de liens
// courts de la webapp (/l/<code>/<chemin>, clics visibles dans l'admin,
// Contenu → Liens courts). Même mécanique que daily-x et daily-bsky.
export function lienDaily(jour, code = "daily-tm") {
  return `${SITE}/l/${code}/${jour}`;
}

const prenomNom = (p, n) => `${p} ${n}`.trim();
const phrase = (m) => {
  const qui = prenomNom(m.collab_prenom, m.collab_nom);
  const elu = `${m.elu_nom}${m.elu_groupe ? ` (${m.elu_groupe})` : ""}`;
  return m.type === "arrivee" ? `${qui} rejoint l'équipe de ${elu}`
    : m.type === "depart" ? `${qui} quitte l'équipe de ${elu}`
      : `${qui} passe de l'équipe de ${m.elu_origine_nom ?? "?"} à celle de ${elu}`;
};

const pluriel = (n, s, p = `${s}s`) => `${n} ${n > 1 ? p : s}`;

// « 30 mouvements : 20 arrivées, 10 départs » — paramètre {{2}} du gabarit
// WhatsApp et première ligne des chaînes. Les types à 0 sont omis.
export function recapResume(mvts) {
  const parties = TYPES
    .map((t) => { const n = mvts.filter((m) => m.type === t).length; return n ? pluriel(n, TITRE[t].toLowerCase()) : null; })
    .filter(Boolean);
  return `${pluriel(mvts.length, "mouvement")} : ${parties.join(", ")}`;
}

// Sections « type puis chambre » à partir des N premiers mouvements.
function groupes(mvts) {
  const affiches = mvts.slice(0, MAX_LIGNES_CHAINE);
  const reste = mvts.length - affiches.length;
  const g = [];
  for (const t of TYPES) {
    const duType = affiches.filter((m) => m.type === t);
    if (!duType.length) continue;
    const chambres = CHAMBRES
      .filter((c) => duType.some((m) => m.chambre === c))
      .map((c) => [c, duType.filter((m) => m.chambre === c)]);
    g.push([t, duType.length, chambres]);
  }
  return [g, reste];
}

// Version texte (WhatsApp).
export function recapTexte(mvts, jour) {
  const [g, reste] = groupes(mvts);
  const lignes = [`DataParl' Daily — ${dateLongue(jour)}`, recapResume(mvts), ""];
  for (const [t, n, chambres] of g) {
    lignes.push(`${ENTETE[t]} ${TITRE[t]} (${n})`);
    for (const [c, ms] of chambres) {
      lignes.push(`${CHAMBRE_LONG[c]} (${ms.length})`);
      lignes.push(...ms.map((m) => `${EMOJI[t]} ${phrase(m)}`));
    }
    lignes.push("");
  }
  if (reste > 0) lignes.push(`Et ${reste} autre${reste > 1 ? "s" : ""}…`, "");
  lignes.push(`Tout voir : ${lienDaily(jour)}`);
  return lignes.join("\n");
}

// Version Telegram (HTML).
const escT = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function recapTelegram(mvts, jour) {
  const [g, reste] = groupes(mvts);
  const lignes = ["📣 <b>DataParl' Daily — " + escT(dateLongue(jour)) + "</b>", escT(recapResume(mvts)), ""];
  for (const [t, n, chambres] of g) {
    lignes.push(`${ENTETE[t]} <b>${TITRE[t]}</b> (${n})`);
    for (const [c, ms] of chambres) {
      lignes.push(`<b>${escT(CHAMBRE_LONG[c])}</b> (${ms.length})`);
      lignes.push(...ms.map((m) => `${EMOJI[t]} ${escT(phrase(m))}`));
    }
    lignes.push("");
  }
  if (reste > 0) lignes.push(`Et ${reste} autre${reste > 1 ? "s" : ""}…`, "");
  lignes.push("👉 Tout voir : " + lienDaily(jour));
  return lignes.join("\n");
}
