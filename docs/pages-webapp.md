# Pages de la webapp — à ajouter dans dataparl/webapp

Ce dépôt fait la diffusion. Les pages d'abonnement public restent dans la
webapp (elles sont légères). Deux options :

## `/daily/tm` — redirection simple

Aucun formulaire : un lien vers le canal.

```tsx
// app/(site)/daily/tm/page.tsx
export const metadata = { title: "Le DataParl' Daily sur Telegram",
  alternates: { canonical: "/daily/tm" } };

export default function ChaineTelegram() {
  return (
    <>
      <h1>Le DataParl&apos; Daily sur <span className="surligne">Telegram</span></h1>
      <p className="lead">
        Chaque matin, le récapitulatif de tous les mouvements de collaborateurs
        parlementaires publié dans notre canal Telegram. Rejoins-le en un clic :
      </p>
      <p><a href="https://t.me/dataparl_daily"><strong>Rejoindre le canal</strong></a></p>
    </>
  );
}
```

## `/daily/wa` — formulaire + API d'abonnement

Le formulaire enregistre le numéro dans `wa_abonnes` (Supabase auth — table
créée par `sql/schema.sql` de ce dépôt) avec le hash du jeton de
désinscription, opt-in explicite requis. Schéma de l'API :

- `POST /api/chaine-wa` — corps `{ tel, consent }`, répond `{ desinscription }` ;
- `GET /api/chaine-wa?desinscription=<jeton>` — désinscription en un clic.

Le même modèle que les jetons de préférences des alertes email de la webapp.
