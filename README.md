# daily-wa-tm

Diffusion quotidienne du **DataParl' Daily** vers deux chaînes :

- **Telegram** : le bot `@dataparl_bot` publie le récap chaque matin dans le canal `dataparl_daily`.
- **WhatsApp** : la Cloud API Meta envoie le récap à chaque abonné opté-in de `dataparl.fr/daily/wa`.

Contenu identique pour tous : le récapitulatif de **tous** les mouvements de collaborateurs
parlementaires du jour même (`date_event` = jour J, source `live` — exactement comme la
page `/daily/[date]` de la webapp, dont le lien du message pointe vers la page du jour),
contrairement aux alertes email, personnalisées par abonnement. Les exclusions
temporaires (même liste que `lib/exclusions.ts` côté webapp) ne sont pas diffusées.

Zéro dépendance : Node 20 natif (`fetch`, `node:test`). Exécuté par GitHub Actions,
pas de serveur.

## Chaînes

Deux comptes Telegram sont prévus :

- `@dataparl_bot` : le **diffuseur**, admin du canal `dataparl_daily`. Il ne répond
  pas aux messages, il publie uniquement le Daily. Son token est le secret
  `TELEGRAM_BOT_TOKEN`.
- `@DataParl_bot` (ultérieur) : l'« assistant » public branché sur chat.dataparl.fr.
  Il vit dans un autre dépôt — ne rien mettre ici.

## Secrets GitHub (Settings → Secrets and variables → Actions)

| Secret | Rôle |
|---|---|
| `DATA_SUPABASE_URL` | URL du Supabase data (mouvements) |
| `DATA_SUPABASE_KEY` | Clé publique (anon) du Supabase data |
| `AUTH_SUPABASE_URL` | URL du Supabase auth (abonnés WhatsApp) |
| `AUTH_SUPABASE_SERVICE_ROLE_KEY` | Clé service_role (lecture `wa_abonnes` uniquement) |
| `TELEGRAM_BOT_TOKEN` | Token du bot diffuseur `@dataparl_bot` |
| `TELEGRAM_CHAT_ID` | Canal `@dataparl_daily` ou son id numérique `-100…` |
| `WHATSAPP_TOKEN` | Token permanent Cloud API |
| `WHATSAPP_PHONE_ID` | Phone number ID |
| `WHATSAPP_TEMPLATE` | Gabarit Meta approuvé (3 variables) |

Chaîne non configurée (secret vide) = ignorée proprement, le run reste vert.

## Gabarit WhatsApp `daily_recap` (Meta Business → Message templates)

Catégorie **Utility**, langue `fr`, texte avec 3 variables :

```
DataParl' Daily du {{1}} : {{2}}.
Tout voir : {{3}}
```

La fenêtre de réponse de 24 h impose un gabarit approuvé pour un envoi quotidien.

## Cron

`.github/workflows/daily.yml` : `30 6 * * *` UTC = 8h30 Paris en été (7h30 en hiver ;
GitHub ne gère pas les fuseaux). Le cron doit rester **après** le workflow « Suivi
quotidien » du dépôt `collaborateurs` (05:47 UTC, synchro Supabase vers 06:08) :
sinon le digest part avant que les mouvements du jour ne soient en base (bug du
13/10/2026 : 1 mouvement annoncé au lieu de 13). Le job est aussi déclenchable à
la main (onglet Actions → Daily → Run workflow) pour tester.

Idempotence : chaque diffusion est journalisée dans `chaine_sends` (Supabase auth,
voir `sql/schema.sql`) ; relancer le même jour n'envoie rien deux fois.

## Mise en place

1. Exécuter `sql/schema.sql` dans le Supabase auth (SQL Editor) ;
2. Créer le bot et le canal Telegram, renseigner `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` ;
3. Configurer Meta Business et faire approuver le gabarit, renseigner les secrets `WHATSAPP_*` ;
4. Renseigner les secrets Supabase ;
5. Run workflow pour tester, puis laisser le cron faire.

## Licence et anonymat

Comme pour l'ensemble des dépôts `dataparl/*` : voir les conventions du projet
(anonymat de l'éditeur, signatures). Données sous ODbL.
