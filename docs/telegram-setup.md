# Créer le canal et le bot Telegram — pas à pas

Deux comptes, deux rôles (voir README) :

- **`@dataparl_bot`** : le diffuseur. Il publie le Daily dans le canal, il ne
  discute pas. C'est le seul utilisé par ce dépôt.
- **`@DataParl_bot`** (plus tard) : l'assistant public, branché sur
  chat.dataparl.fr — dans un autre dépôt.

## 1. Créer le bot diffuseur `@dataparl_bot`

1. Dans Telegram, ouvrir une conversation avec **@BotFather**.
2. Envoyer `/newbot`.
3. Nom affiché : `DataParl' Daily`.
4. Identifiant : `dataparl_bot` — BotFather impose un suffixe `bot`.
   Si `dataparl_bot` est pris (identifiants Telegram mondiaux),
   essayer `dataparl_daily_bot` ; le nom visible reste « DataParl' Daily ».
5. BotFather répond avec un **token** du type
   `123456789:AAH3x9...` → le garder : c'est `TELEGRAM_BOT_TOKEN`.

## 2. Créer le canal public `dataparl_daily`

1. Telegram → icône crayon → **Nouveau canal**.
2. Nom : `DataParl' Daily`, description : « Chaque matin, tous les mouvements
   de collaborateurs parlementaires (AN, Sénat, Parlement européen) ».
3. Type : **public**, lien `t.me/dataparl_daily` — les visiteurs de
   dataparl.fr/daily/tm rejoignent le canal sans invitation.

## 3. Ajouter le bot comme administrateur du canal

1. Dans le canal : titre → **Administrateurs** → **Ajouter un admin**.
2. Chercher `@dataparl_bot` (créé à l'étape 1).
3. Droits : garder **Publier des messages** uniquement. Décocher le reste
   (ajouter des membres, modifier les infos…) : le bot ne doit rien
   pouvoir faire d'autre.

## 4. Le `TELEGRAM_CHAT_ID` — rien à faire ✓

Le canal est **public** : son adresse `@dataparl_daily` sert directement
d'identifiant, et c'est la valeur par défaut du bot. Le secret
`TELEGRAM_CHAT_ID` est donc **facultatif** — à renseigner seulement si un
jour le canal change ou devient privé :

- canal public : `@dataparl_daily` ;
- canal privé : id numérique `-100…`, à lire dans
  `https://api.telegram.org/bot<TOKEN>/getUpdates` après y avoir publié
  un message (champ `"chat":{"id":…}`).

## 5. Tester un envoi à la main

```bash
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
  -d chat_id="@dataparl_daily" \
  --data-urlencode text="📣 <b>DataParl' Daily</b> — test de diffusion.
<b>Assemblée nationale</b> (1)
Arrivée · Marie Dupont rejoint l'équipe de Martin (GDR)" \
  -d parse_mode="HTML"
```

Si `{"ok":true}` arrive et que le message apparaît dans le canal, c'est bon.

## 6. Renseigner le secret GitHub

Dans `dataparl/daily-wa-tm` : Settings → Secrets and variables → Actions →
New repository secret :

- `TELEGRAM_BOT_TOKEN` = le token de l'étape 1 (`TELEGRAM_CHAT_ID` inutile :
  valeur par défaut `@dataparl_daily`).

Puis Run workflow (onglet Actions → Daily) pour vérifier la première
diffusion réelle.

## Plus tard : l'assistant `@DataParl_bot`

Même principe (`/newbot` via BotFather), mais développement séparé :
webhooks entrants, réponses aux questions, branchement sur chat.dataparl.fr.
Ne rien ajouter ici — ce dépôt reste un diffuseur minimal.
