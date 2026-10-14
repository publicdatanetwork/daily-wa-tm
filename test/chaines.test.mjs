import { test } from "node:test";
import assert from "node:assert/strict";
import { recapResume, recapTexte, recapTelegram, dateLongue, lienDaily } from "../src/chaines.mjs";

const mvt = (over = {}) => ({
  type: "arrivee", chambre: "assemblee", collab_prenom: "Marie", collab_nom: "Dupont",
  elu_nom: "Martin", elu_groupe: "GDR", ...over,
});

test("dateLongue", () => {
  assert.equal(dateLongue("2026-10-11"), "11 octobre 2026");
});

test("lienDaily tracé avec le code daily-tm", () => {
  assert.equal(lienDaily("2026-10-11"), "https://www.dataparl.fr/l/daily-tm/2026-10-11");
});

test("recapResume compte par type, omet les zéros, sépare par virgules", () => {
  const r = recapResume([mvt(), mvt({ type: "depart" }), mvt({ type: "transfert", chambre: "senat" })]);
  assert.equal(r, "3 mouvements : 1 arrivée, 1 départ, 1 transfert");
  const sansTransfert = recapResume([mvt(), mvt({ type: "depart" })]);
  assert.equal(sansTransfert, "2 mouvements : 1 arrivée, 1 départ");
});

test("recapTelegram regroupe par type puis par chambre, avec émojis", () => {
  const t = recapTelegram([
    mvt({ elu_nom: "Evrrard" }),
    mvt({ type: "depart", chambre: "senat" }),
    mvt({ type: "arrivee", chambre: "senat" }),
  ], "2026-10-11");
  // L'entête Arrivées vient avant Départs.
  assert.ok(t.indexOf("Arrivées") < t.indexOf("Départs"));
  // Chaque type regroupe ses chambres à la suite.
  assert.ok(t.includes("✅ <b>Arrivées</b> (2)"));
  assert.ok(t.includes("🚪 <b>Départs</b> (1)"));
  assert.ok(t.includes("➕ Marie Dupont rejoint l'équipe de Evrrard (GDR)"));
  // Lien tracé en fin de message.
  assert.ok(t.includes("https://www.dataparl.fr/l/daily-tm/2026-10-11"));
});

test("recapTexte même structure sans HTML", () => {
  const t = recapTexte([mvt(), mvt({ type: "depart" })], "2026-10-11");
  assert.ok(t.includes("✅ Arrivées (1)"));
  assert.ok(t.includes("🚪 Départs (1)"));
  assert.ok(t.includes("➖ Marie Dupont quitte l'équipe de Martin (GDR)"));
  assert.ok(t.includes("https://www.dataparl.fr/l/daily-tm/2026-10-11"));
});

test("recapTelegram échappe le HTML", () => {
  const t = recapTelegram([mvt({ elu_nom: "A <b>" })], "2026-10-11");
  assert.ok(t.includes("A &lt;b&gt;"));
});

test("transfert phrase l'élu d'origine", () => {
  const t = recapTexte([mvt({ type: "transfert", elu_origine_nom: "Durand" })], "2026-10-11");
  assert.match(t, /passe de l'équipe de Durand/);
});
