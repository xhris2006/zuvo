# Notifications internes et Web Push

> **État : les notifications internes fonctionnent dès que Supabase est
> configuré. Les notifications push fonctionnent dès que les variables de la
> section 2 sont renseignées et que l'utilisateur les a activées sur son
> appareil.** La page **Administration → Configuration** indique ce qui manque.
> La chaîne d'envoi est testée automatiquement sur une vraie base et un vrai
> PostgREST (seul le service push des navigateurs est simulé) ; l'envoi réel
> doit être vérifié sur appareils (section 3).

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
| `moderation_warning`    | avertissement de la modération                                     | toujours envoyée                                                  |
| `support_reply`         | réponse de l'équipe à une demande d'assistance ou une contestation | toujours envoyée                                                  |

Aucune notification n'est créée entre deux utilisateurs qui se sont bloqués.
Les notifications de message servent à l'envoi push : elles n'apparaissent pas
dans la page Notifications (les messages ont leur propre boîte de réception et
leur propre compteur) et sont marquées comme lues à l'ouverture de la
conversation.

Les compteurs de l'en-tête et de la barre de navigation sont calculés côté
serveur puis mis à jour en temps réel (Supabase Realtime, filtré par RLS).

### Web Push

```
action de l'utilisateur (message, abonnement, favori, publication) ou de la modération
   └─► déclencheur en base : crée la notification (préférences, blocages)
   └─► après la réponse (after() de Next.js), sur le serveur de l'application :
         ├─ réserve les notifications créées par cette action (colonne pushed_at :
         │  jamais d'envoi en double)
         ├─ relit le contenu avec la clé service_role, ignore les comptes suspendus
         ├─ vérifie push_enabled et récupère les appareils du destinataire
         └─ envoie via web-push (VAPID, priorité haute pour les messages) ;
            supprime les abonnements expirés (404/410)
```

Aucun webhook Supabase n'est nécessaire (les versions précédentes en
utilisaient un ; s'il a été créé, il peut être supprimé : la route
`/api/push/dispatch` n'existe plus).

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
- Chaque nouveau message déclenche une notification push ; elles se
  remplacent pour une même conversation (une seule visible à la fois).
- Si les clés VAPID changent, les appareils déjà abonnés doivent réactiver
  les notifications (l'application le détecte et les réabonne au clic).
- Limites connues : pas de gestion de `pushsubscriptionchange` (l'abonnement
  expiré est supprimé au premier échec et l'utilisateur le réactive).

## 2. Configuration (à faire par le propriétaire du projet)

Le plus simple : connectez-vous avec un compte administrateur et ouvrez
**Administration → Configuration**. La page vérifie chaque point (base à jour,
clé service_role acceptée, clés VAPID présentes et cohérentes) et permet de
**générer les clés VAPID dans votre navigateur** (elles ne sont ni envoyées
ni enregistrées).

### 2.1 Clés VAPID

Depuis la page Configuration (bouton « Générer une paire de clés VAPID »), ou
sur votre machine avec `npx web-push generate-vapid-keys`. Ne partagez jamais
la clé privée (ni dans le dépôt, ni dans une conversation).

### 2.2 Variables d'environnement (Vercel → Settings → Environment Variables)

| Variable                       | Exposée au navigateur | Valeur                                                   |
| ------------------------------ | --------------------- | -------------------------------------------------------- |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | oui (publique)        | clé publique VAPID                                       |
| `VAPID_PRIVATE_KEY`            | **non**               | clé privée VAPID                                         |
| `VAPID_SUBJECT`                | non                   | `mailto:adresse-de-contact@…` ou `https://votre-domaine` |
| `SUPABASE_SERVICE_ROLE_KEY`    | **non**               | clé secrète Supabase (`sb_secret_…` ou `service_role`)   |

Les variables sans préfixe `NEXT_PUBLIC_` ne sont lues que côté serveur
(`src/lib/server-env.ts`, protégé par `server-only`) et ne sont jamais
journalisées. **Redéployez** après les avoir renseignées (les variables
`NEXT_PUBLIC_*` sont figées au moment du build).

Les espaces, retours à la ligne et guillemets copiés par erreur autour d'une
valeur sont ignorés, et une adresse e-mail seule dans `VAPID_SUBJECT` est
complétée par `mailto:`. Une variable encore mal formée est signalée par son
nom dans la page Configuration (« Variables mal formées ») et ignorée.

### 2.3 Base de données à jour

Les migrations `20261021100000_push_direct_dispatch.sql` (colonne `pushed_at`)
et `20261022100000_push_delivery_status.sql` (résultat de chaque envoi) sont
nécessaires. La page Configuration signale une base en retard.

### 2.4 Activation sur chaque appareil

Chaque utilisateur active les notifications **sur chacun de ses appareils** :
bandeau « Activer les notifications » dans Messages ou Notifications, ou
**Paramètres → Notifications push → Activer**, puis « Envoyer un test ».
Sur iPhone, le site doit d'abord être ajouté à l'écran d'accueil (iOS 16.4+).

### 2.5 Diagnostic

- **Administration → Configuration → Derniers envois push** : résultat des
  dernières notifications traitées (envoyée, aucun appareil activé, push
  désactivé, refusée par le service push avec son code HTTP), sans
  destinataire ni contenu, et nombre de notifications jamais traitées.
- **Paramètres → Notifications push** : chaque utilisateur voit le résultat
  de sa dernière notification.
- Un code `HTTP 401/403` signifie que l'appareil a été abonné avec d'autres
  clés VAPID : il est réabonné automatiquement au chargement suivant du site
  (autorisation déjà accordée), sinon désactiver puis réactiver suffit.

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
déconnexion, l'appareil ne reçoit plus rien ; les logs Vercel ne contiennent
aucun secret.
