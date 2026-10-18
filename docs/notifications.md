# Notifications internes et Web Push

> **État : les notifications internes fonctionnent dès que Supabase est
> configuré. Les notifications push ne sont PAS opérationnelles tant que les
> étapes de la section 2 n'ont pas été réalisées et vérifiées sur de vrais
> appareils (section 3).** Le code d'envoi est testé automatiquement avec des
> doubles (web-push et Supabase simulés), mais aucun envoi réel n'a été
> effectué à ce jour.

## 1. Fonctionnement

### Notifications internes

Les notifications sont créées **uniquement par la base de données**
(déclencheurs `SECURITY DEFINER`, migration
`20261018150000_notification_triggers.sql`) ; aucun utilisateur ne peut en
créer via l'API.

| Type                    | Événement                                                          | Préférence                                                        |
| ----------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `new_message`           | message reçu (une seule notification non lue par conversation)     | « Nouveaux messages »                                             |
| `new_follower`          | nouvel abonné (au plus une par abonné et par jour)                 | « Nouveaux abonnés »                                              |
| `listing_favorited`     | annonce ajoutée aux favoris (une par utilisateur, annonce et jour) | « Activité de mes annonces »                                      |
| `followed_user_listing` | première publication d'une annonce d'un profil suivi               | « Nouvelles annonces des profils suivis » (désactivée par défaut) |
| `listing_removed`       | annonce retirée par la modération                                  | toujours envoyée                                                  |

Aucune notification n'est créée entre deux utilisateurs qui se sont bloqués.
Les notifications de message servent à l'envoi push : elles n'apparaissent pas
dans la page Notifications (les messages ont leur propre boîte de réception et
leur propre compteur) et sont marquées comme lues à l'ouverture de la
conversation.

Les compteurs de l'en-tête et de la barre de navigation sont calculés côté
serveur puis mis à jour en temps réel (Supabase Realtime, filtré par RLS).

### Web Push

```
insertion dans notifications
   └─► webhook de base de données Supabase (POST, en-tête Authorization)
         └─► /api/push/dispatch (Vercel)
               ├─ vérifie le secret partagé (comparaison à temps constant)
               ├─ relit la notification avec la clé service_role (seul l'id du webhook est utilisé)
               ├─ vérifie push_enabled et récupère les appareils du destinataire
               └─ envoie via web-push (VAPID) ; supprime les abonnements expirés (404/410)
```

- La permission du navigateur n'est demandée **qu'au clic** sur « Activer »
  (Paramètres → Notifications push), jamais au chargement d'une page.
- Le contenu push ne reprend jamais le texte des messages privés (seulement
  « Awa vous a écrit à propos de « … » »).
- Le service worker (`public/sw.js`) n'ouvre que des chemins internes au site
  et ne met aucune page ni réponse d'API en cache.
- Le serveur ne contacte que les services push des navigateurs
  (`fcm.googleapis.com`, `updates.push.services.mozilla.com`,
  `web.push.apple.com`, `*.notify.windows.com`) : règle imposée en base
  (contrainte `push_subscriptions_known_service`), à l'enregistrement et à
  l'envoi. Les abonnements ne peuvent être créés que par la fonction
  `register_push_subscription` (plafond, comptes suspendus).
- Aucune notification push n'est envoyée au nom d'un compte suspendu.
- Un navigateur partagé est retiré du compte à la déconnexion ; un même
  navigateur ne peut appartenir qu'à un compte à la fois ; 10 appareils au
  plus par compte.
- Limites connues : une seule notification push par conversation tant que la
  précédente n'est pas lue ; pas de gestion de `pushsubscriptionchange`
  (l'abonnement expiré est supprimé au premier échec et l'utilisateur le
  réactive) ; une annonce publiée par un vendeur très suivi déclenche un appel
  du webhook par abonné ayant activé l'option.

## 2. Configuration (à faire par le propriétaire du projet)

### 2.1 Clés VAPID

Générez une paire de clés **sur votre machine** (ne la partagez dans aucune
conversation ni aucun commit) :

```bash
npx web-push generate-vapid-keys
```

### 2.2 Variables d'environnement (Vercel → Settings → Environment Variables)

| Variable                       | Exposée au navigateur | Valeur                                                                |
| ------------------------------ | --------------------- | --------------------------------------------------------------------- |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | oui (publique)        | clé publique VAPID                                                    |
| `VAPID_PRIVATE_KEY`            | **non**               | clé privée VAPID                                                      |
| `VAPID_SUBJECT`                | non                   | `mailto:adresse-de-contact@…` ou `https://votre-domaine`              |
| `SUPABASE_SERVICE_ROLE_KEY`    | **non**               | clé secrète Supabase (`sb_secret_…` ou `service_role`)                |
| `PUSH_WEBHOOK_SECRET`          | **non**               | chaîne aléatoire d'au moins 32 caractères (`openssl rand -base64 48`) |

Les variables sans préfixe `NEXT_PUBLIC_` ne sont lues que côté serveur
(`src/lib/server-env.ts`, protégé par `server-only`) et ne sont jamais
journalisées. Redéployez après les avoir renseignées.

Tant qu'une de ces variables manque, `/api/push/dispatch` répond `503
push_not_configured` et la page Paramètres indique que le push n'est pas encore
disponible.

### 2.3 Webhook de base de données (Supabase)

**Database → Webhooks → Create a new hook** :

- Table : `public.notifications`, événement : **Insert** ;
- Type : **HTTP Request**, méthode **POST** ;
- URL : `https://<votre-domaine>/api/push/dispatch` (domaine de production, pas
  une prévisualisation protégée par mot de passe) ;
- En-têtes : `Content-Type: application/json` et
  `Authorization: Bearer <PUSH_WEBHOOK_SECRET>` ;
- Délai : 5000 ms.

Le secret est saisi dans le tableau de bord Supabase, jamais dans une
migration ou un fichier du dépôt.

## 3. Vérification sur appareils (obligatoire avant d'annoncer le push)

Pour chaque appareil : se connecter, Paramètres → Notifications push →
**Activer**, accepter la demande du navigateur, puis **Envoyer un test**.
Vérifier ensuite un vrai scénario (un second compte envoie un message, site
fermé) et le clic sur la notification.

| Plateforme                      | Condition                                                               | Résultat |
| ------------------------------- | ----------------------------------------------------------------------- | -------- |
| Android – Chrome                | —                                                                       | à tester |
| Android – Firefox / Samsung     | —                                                                       | à tester |
| iPhone / iPad – Safari          | iOS 16.4+, site **ajouté à l'écran d'accueil** et ouvert depuis l'icône | à tester |
| Ordinateur – Chrome / Edge      | —                                                                       | à tester |
| Ordinateur – Firefox            | —                                                                       | à tester |
| Ordinateur – Safari (macOS 13+) | —                                                                       | à tester |

Points à contrôler : la notification s'affiche site fermé ; le clic ouvre la
bonne page ; aucune notification n'apparaît pour une conversation déjà ouverte
à l'écran ; « Désactiver sur cet appareil » arrête les envois ; après
déconnexion, l'appareil ne reçoit plus rien ; les logs Vercel de
`/api/push/dispatch` ne contiennent aucun secret.
