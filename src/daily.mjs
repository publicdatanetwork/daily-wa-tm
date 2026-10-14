// Diffusion du DataParl' Daily vers Telegram et WhatsApp.
// Exécuté par .github/workflows/daily.yml (cron quotidien + Run workflow).
// Idempotent via la table chaine_sends : relancer le même jour n'envoie rien.
import { recapResume, recapTelegram, dateLongue } from "./chaines.mjs";

// Les secrets GitHub arrivent parfois avec des espaces, retours à la ligne
// ou sans schéma au copier-coller. Les URLs Supabase sont publiques (elles
// figurent en clair dans lib/env.ts de la webapp) : on les met par défaut,
// et un secret qui ne parse pas comme URL valide est ignoré.
const propre = (v) => (process.env[v] ?? "").trim();
const urlOuDefaut = (nom, defaut) => {
  const v = propre(nom);
  try { return v ? new URL(v).toString().replace(/\/$/, "") : defaut; }
  catch { return defaut; }
};

const DATA_URL = urlOuDefaut("DATA_SUPABASE_URL", "https://yuhqajaznizwmenmyzms.supabase.co");
const DATA_KEY = propre("DATA_SUPABASE_KEY");
const AUTH_URL = urlOuDefaut("AUTH_SUPABASE_URL", "https://kuywydrsfuixppchugpe.supabase.co");
const AUTH_KEY = propre("AUTH_SUPABASE_SERVICE_ROLE_KEY");
const TG_TOKEN = propre("TELEGRAM_BOT_TOKEN");
// Canal public : l'adresse suffit, pas besoin d'id numérique.
const TG_CHAT = propre("TELEGRAM_CHAT_ID") || "@dataparl_daily";
const WA_TOKEN = propre("WHATSAPP_TOKEN");
const WA_PHONE_ID = propre("WHATSAPP_PHONE_ID");
const WA_TEMPLATE = propre("WHATSAPP_TEMPLATE");

// Mini App DataParl' Chat hébergée par le bot (page /chat de la webapp) :
// bouton sous chaque Daily. Si Telegram refuse le clavier inline avec web_app
// dans le canal, on retente sans bouton : la diffusion prime.
const CHAT_APP = "https://www.dataparl.fr/chat";
const boutonChat = { inline_keyboard: [[{ text: "💬 Poser une question", web_app: { url: CHAT_APP } }]] };

// Exclusions temporaires de mouvements — même liste que lib/exclusions.ts
// de la webapp (mesure ponctuelle : arrivées du Sénat mal datées lors de la
// republication du 2026-10-09). À vider quand les dates sont corrigées
// côté dépôt collaborateurs.
const EXCLUSIONS_MVTS = [
  { chambre: "senat", type: "arrivee", date_event: "2026-10-09" },
];
const paramExclusions = EXCLUSIONS_MVTS.length
  ? "(" + EXCLUSIONS_MVTS.map((e) => `and(chambre.eq.${e.chambre},type.eq.${e.type},date_event.eq.${e.date_event})`).join(",") + ")"
  : null;

// — Date « jour » à Paris, quoi qu'il soit sur le runner (UTC).
function aujourdhuiParis() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(new Date());
}

async function supabase(url, key, path, params) {
  const r = await fetch(`${url}/rest/v1/${path}?${new URLSearchParams(params)}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" },
  });
  if (!r.ok) throw new Error(`Supabase ${path} ${r.status} : ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

async function mouvementsDuJour(jour) {
  // Mouvements « live » du jour J uniquement — exactement la même fenêtre
  // que la page /daily/[jour] de la webapp (date_event = jour, source live),
  // en excluant les exclusions temporaires ci-dessus. Le lien du message
  // pointe vers cette page : le contenu annoncé doit donc la matcher.
  const p = {
    select: "id,type,chambre,date_event,collab_prenom,collab_nom,elu_nom,elu_groupe,elu_origine_nom",
    source: "eq.live",
    date_event: `eq.${jour}`,
    order: "date_event.desc,chambre.asc,id.asc", limit: "500",
  };
  if (paramExclusions) p["not.or"] = paramExclusions;
  return await supabase(DATA_URL, DATA_KEY, "mouvements", p);
}

async function dejaDiffuse(jour, canal) {
  const rows = await supabase(AUTH_URL, AUTH_KEY, "chaine_sends", {
    select: "id", canal: `eq.${canal}`, jour: `eq.${jour}`, limit: "1",
  });
  return rows.length > 0;
}
async function notifierDiffusion(jour, canal, n) {
  const r = await fetch(`${AUTH_URL}/rest/v1/chaine_sends`, {
    method: "POST",
    headers: { apikey: AUTH_KEY, Authorization: `Bearer ${AUTH_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ canal, jour, n_mouvements: n }),
  });
  if (!r.ok) throw new Error(`chaine_sends ${r.status} : ${(await r.text()).slice(0, 200)}`);
}

async function telegram(mvts, jour) {
  if (!TG_TOKEN) return "Telegram : non configuré (secrets absents), ignoré.";
  if (await dejaDiffuse(jour, "telegram")) return "Telegram : déjà diffusé aujourd'hui.";
  const envoyerTelegram = async (reply_markup) => {
    const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TG_CHAT, text: recapTelegram(mvts, jour), parse_mode: "HTML",
        link_preview_options: { url: `https://www.dataparl.fr/daily/${jour}` },
        ...(reply_markup ? { reply_markup } : {}),
      }),
    });
    return r;
  };
  let r = await envoyerTelegram(boutonChat);
  if (!r.ok) {
    // Repli sans bouton (p. ex. web_app non accepté dans un canal) :
    // la diffusion prime sur le bouton.
    r = await envoyerTelegram(null);
  }
  if (!r.ok) throw new Error(`Telegram ${r.status} : ${(await r.text()).slice(0, 200)}`);
  await notifierDiffusion(jour, "telegram", mvts.length);
  return `Telegram : diffusé dans ${TG_CHAT} (${mvts.length} mouvements).`;
}

async function whatsapp(mvts, jour) {
  if (!WA_TOKEN || !WA_PHONE_ID || !WA_TEMPLATE) return "WhatsApp : non configuré (secrets absents), ignoré.";
  if (await dejaDiffuse(jour, "whatsapp")) return "WhatsApp : déjà diffusé aujourd'hui.";
  const abonnes = await supabase(AUTH_URL, AUTH_KEY, "wa_abonnes", { select: "tel", actif: "eq.true", limit: "1000" });
  const resume = recapResume(mvts);
  const lien = `https://www.dataparl.fr/l/daily-wa/${jour}`;
  let ok = 0; const echecs = [];
  for (const a of abonnes) {
    const r = await fetch(`https://graph.facebook.com/v21.0/${WA_PHONE_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp", to: a.tel, type: "template",
        template: {
          name: WA_TEMPLATE, language: { code: "fr" },
          components: [{ type: "body", parameters: [
            { type: "text", text: dateLongue(jour) },
            { type: "text", text: resume },
            { type: "text", text: lien },
          ] }],
        },
      }),
    });
    if (r.ok) ok += 1;
    else echecs.push(`${a.tel} : ${(await r.text()).slice(0, 120)}`);
  }
  await notifierDiffusion(jour, "whatsapp", mvts.length);
  return `WhatsApp : ${ok}/${abonnes.length} envoyés${echecs.length ? ` ; échecs : ${echecs.slice(0, 5).join(" | ")}` : ""}`;
}

// — Point d'entrée.
const jour = aujourdhuiParis();
console.log(`DataParl' Daily — diffusion du ${jour}`);
const mvts = await mouvementsDuJour(jour);
console.log(`${mvts.length} mouvements.`);
if (!mvts.length) {
  console.log("Rien à diffuser aujourd'hui.");
} else {
  console.log(await telegram(mvts, jour));
  console.log(await whatsapp(mvts, jour));
}
