import type { ListingCondition, ListingStatus } from "@/features/listings/constants";

const conditions: Record<ListingCondition, string> = {
  new_with_tags: "Neuf avec étiquette",
  new_without_tags: "Neuf sans étiquette",
  very_good: "Très bon état",
  good: "Bon état",
  fair: "État correct",
  for_parts: "Pour pièces",
};

const conditionHints: Record<ListingCondition, string> = {
  new_with_tags: "Jamais utilisé, étiquette encore attachée.",
  new_without_tags: "Jamais utilisé, sans étiquette.",
  very_good: "Peu utilisé, aucun défaut visible.",
  good: "Utilisé, quelques signes d'usure.",
  fair: "Défauts visibles, précisés dans la description.",
  for_parts: "Ne fonctionne pas ou incomplet.",
};

const statuses: Record<ListingStatus, string> = {
  draft: "Brouillon",
  active: "En vente",
  reserved: "Réservé",
  sold: "Vendu",
  withdrawn: "Retiré",
};

/** Citation à la française, avec espaces insécables (« titre » ne se coupe pas). */
const quote = (value: string) => `«\u00a0${value}\u00a0»`;

export const fr = {
  common: {
    skipToContent: "Aller au contenu principal",
    loading: "Chargement…",
    retry: "Réessayer",
    backHome: "Retour à l'accueil",
    back: "Retour",
    share: "Partager",
    linkCopied: "Lien copié",
    seeAll: "Tout voir",
    search: "Rechercher",
    signIn: "Se connecter",
    signUp: "Créer un compte",
    close: "Fermer",
    free: "Gratuit",
  },
  nav: {
    primary: "Navigation principale",
    home: "Accueil",
    explore: "Explorer",
    sell: "Vendre",
    messages: "Messages",
    profile: "Profil",
    favorites: "Favoris",
    notifications: "Notifications",
    sellCta: "Vendre un article",
    searchPlaceholder: "Rechercher un article…",
    searchLabel: "Rechercher des annonces",
    unreadMessages: (count: number) =>
      count === 1 ? "1 message non lu" : `${count} messages non lus`,
    unreadNotifications: (count: number) =>
      count === 1 ? "1 notification non lue" : `${count} notifications non lues`,
  },
  home: {
    heroTitle: "Donnez une seconde vie à vos affaires",
    heroSubtitle:
      "Vendez gratuitement ce que vous n'utilisez plus et trouvez de bonnes affaires près de chez vous, partout au Cameroun.",
    heroSecondary: "Explorer les annonces",
    valueTitle: "Pourquoi vendre sur Zuvo ?",
    values: {
      freeTitle: "Publication gratuite",
      freeBody: "Mettez vos articles en ligne en quelques minutes, sans frais de publication.",
      noFeeTitle: "Aucune commission",
      noFeeBody: "Le prix que vous fixez est le prix que vous encaissez.",
      directTitle: "Contact direct",
      directBody: "Échangez directement avec l'acheteur ou le vendeur via la messagerie.",
    },
    categoriesTitle: "Catégories",
    followedTitle: "De vos abonnements",
    recentTitle: "Annonces récentes",
    sellCardTitle: "Des affaires à vendre ?",
    sellCardBody: "Publiez gratuitement en quelques minutes.",
    sellCardCta: "Vendre",
    recentEmptyTitle: "Aucune annonce pour le moment",
    recentEmptyBody:
      "Les premières annonces publiées apparaîtront ici. Lancez-vous et mettez un article en vente.",
    safetyTitle: "Vendez et achetez en toute sérénité",
    safetyBody:
      "Rencontrez-vous dans un lieu public, vérifiez l'article avant de payer et n'envoyez jamais d'argent à l'avance.",
    safetyCta: "Lire nos conseils de sécurité",
  },
  explore: {
    title: "Explorer",
    description: "Trouvez des articles de seconde main près de chez vous.",
    filters: "Filtres",
    applyFilters: "Appliquer",
    resetFilters: "Réinitialiser",
    keywords: "Mots-clés",
    keywordsPlaceholder: "Ex. : robe, iPhone, baskets",
    category: "Catégorie",
    allCategories: "Toutes les catégories",
    allCategoriesShort: "Tout",
    city: "Ville",
    allCities: "Toutes les villes",
    condition: "État",
    allConditions: "Tous les états",
    priceMin: "Prix min. (FCFA)",
    priceMax: "Prix max. (FCFA)",
    sort: "Trier par",
    sortOptions: {
      newest: "Plus récentes",
      price_asc: "Prix croissant",
      price_desc: "Prix décroissant",
    },
    emptyTitle: "Aucune annonce trouvée",
    emptyBody: "Essayez d'élargir votre recherche ou de modifier les filtres.",
    unavailableTitle: "Annonces bientôt disponibles",
    unavailableBody:
      "La base de données n'est pas encore connectée. Les annonces publiées apparaîtront ici.",
    tabsLabel: "Que recherchez-vous ?",
    tabArticles: "Articles",
    tabShops: "Boutiques",
    shopsTitle: "Boutiques",
    shopsDescription: "Trouvez un vendeur par son nom ou son pseudo et découvrez ses articles.",
    shopsSearchLabel: "Rechercher une boutique",
    shopsSearchPlaceholder: "Nom ou @pseudo",
    shopsResultsFor: (query: string) => `Boutiques pour ${quote(query)}`,
    shopsCount: (count: number) =>
      count === 0 ? "Aucune boutique" : count === 1 ? "1 boutique" : `${count} boutiques`,
    shopsEmptyTitle: "Aucune boutique trouvée",
    shopsEmptyBody: "Vérifiez l'orthographe du nom ou du pseudo, ou essayez un autre mot.",
    shopsNoneTitle: "Aucune boutique pour le moment",
    shopsNoneBody: "Les vendeurs ayant des annonces en vente apparaîtront ici.",
    shopsUnavailableTitle: "Boutiques momentanément indisponibles",
    shopListings: (count: number) =>
      count === 0 ? "Aucune annonce en vente" : count === 1 ? "1 annonce" : `${count} annonces`,
  },
  listing: {
    conditions,
    conditionHints,
    statuses,
    favoriteAdd: "Ajouter aux favoris",
    favoriteRemove: "Retirer des favoris",
    photoAlt: (title: string) => `Photo de l'annonce « ${title} »`,
    noPhoto: "Pas de photo",
    viewLabel: "Affichage des annonces",
    viewFeed: "Affichage en fil",
    viewGrid: "Affichage en grille",
    sellerProfile: (name: string) => `Profil de ${name}`,
  },
  profile: {
    followers: (count: number) => (count > 1 ? "abonnés" : "abonné"),
    following: (count: number) => (count > 1 ? "abonnements" : "abonnement"),
    listings: (count: number) => (count > 1 ? "annonces" : "annonce"),
    memberSince: (date: string) => `Membre depuis ${date}`,
    statsLabel: "Statistiques du profil",
    tabsLabel: "Sections du profil",
    onSale: "En vente",
    myListings: "Mes annonces",
    favorites: "Favoris",
    menuLabel: "Menu du profil",
    settings: "Paramètres",
    editProfile: "Modifier le profil",
    viewPublicProfile: "Voir mon profil public",
    help: "Aide et contact",
  },
  auth: {
    requiredTitle: "Connexion requise",
    requiredBody: "Connectez-vous ou créez un compte gratuit pour accéder à cette page.",
    sellRequiredBody: "Connectez-vous ou créez un compte gratuit pour mettre un article en vente.",
    signInTitle: "Connexion",
    signUpTitle: "Créer un compte",
    notConfiguredTitle: "Authentification pas encore disponible",
    notConfiguredBody:
      "La connexion sera activée dès que le service d'authentification (Supabase) sera configuré.",
  },
  sell: {
    steps: {
      photos: {
        title: "Photos",
        hint: "Jusqu'à 8 photos nettes. La première sera la photo principale.",
      },
      description: {
        title: "Description",
        hint: "Un titre clair et une description honnête font vendre plus vite.",
      },
      details: { title: "Catégorie et état", hint: "Aidez les acheteurs à trouver votre article." },
      price: {
        title: "Prix et lieu",
        hint: "Gratuit et sans commission : vous encaissez tout le prix.",
      },
      review: { title: "Vérification", hint: "Relisez votre annonce avant de la publier." },
    },
    stepOf: (current: number, total: number) => `Étape ${current} sur ${total}`,
    next: "Continuer",
    back: "Retour",
    edit: "Modifier",
    publish: "Publier l'annonce",
    saveDraft: "Enregistrer le brouillon",
    saveChanges: "Enregistrer les modifications",
    photosRequired: "Ajoutez au moins une photo pour continuer.",
  },
  pages: {
    messagesTitle: "Messages",
    profileTitle: "Profil",
    favoritesTitle: "Favoris",
    notificationsTitle: "Notifications",
    sellTitle: "Vendre un article",
  },
  notifications: {
    someone: "Un utilisateur",
    unavailableListing: "une annonce",
    titles: {
      new_message: "Nouveau message",
      new_follower: "Nouvel abonné",
      followed_user_listing: "Nouvelle annonce",
      listing_favorited: "Annonce ajoutée aux favoris",
      listing_removed: "Annonce retirée",
      moderation_warning: "Avertissement de la modération",
    },
    bodies: {
      new_message: (actor: string, listing: string | null) =>
        listing ? `${actor} vous a écrit à propos de ${quote(listing)}.` : `${actor} vous a écrit.`,
      new_follower: (actor: string) => `${actor} suit désormais votre profil.`,
      followed_user_listing: (actor: string, listing: string) =>
        `${actor} a publié une nouvelle annonce : ${quote(listing)}.`,
      listing_favorited: (actor: string, listing: string) =>
        `${actor} a ajouté ${quote(listing)} à ses favoris.`,
      listing_removed: (listing: string) =>
        `Votre annonce ${quote(listing)} a été retirée par la modération.`,
      moderation_warning: (note: string | null) =>
        note ?? "Merci de respecter les règles de la communauté.",
    },
  },
  reports: {
    reasons: {
      scam: "Arnaque ou fraude",
      prohibited_item: "Article interdit",
      counterfeit: "Contrefaçon",
      inappropriate: "Contenu inapproprié",
      harassment: "Harcèlement ou propos insultants",
      spam: "Spam ou publicité",
      fake_account: "Faux compte ou usurpation",
      other: "Autre motif",
    },
    statuses: {
      pending: "En attente",
      in_review: "En cours d'examen",
      resolved: "Traité",
      dismissed: "Classé sans suite",
    },
    targets: {
      listing: "Annonce",
      user: "Utilisateur",
      message: "Message",
    },
  },
  admin: {
    actions: {
      listing_removed: "Annonce retirée",
      listing_restored: "Annonce restaurée",
      user_suspended: "Compte suspendu",
      user_unsuspended: "Compte réactivé",
      report_in_review: "Signalement pris en charge",
      report_resolved: "Signalement traité",
      report_dismissed: "Signalement classé sans suite",
      message_viewed: "Message signalé consulté",
      user_warned: "Avertissement envoyé",
      profile_reset: "Profil réinitialisé",
      user_listings_removed: "Toutes les annonces retirées",
    },
  },
  footer: {
    about: "Zuvo est une plateforme gratuite de vente entre particuliers.",
    legal: "Informations",
    help: "Aide",
    terms: "Conditions d'utilisation",
    privacy: "Politique de confidentialité",
    safety: "Conseils de sécurité",
    reports: "Signalements et blocage",
    contact: "Aide et contact",
    support: "Assistance",
    rights: "Tous droits réservés.",
  },
  legal: {
    draftTitle: "Document provisoire",
    draftBody:
      "Ce texte est un brouillon. Il doit être relu et validé par un professionnel du droit avant la mise en production.",
    lastUpdated: "Dernière mise à jour",
  },
  errors: {
    notFoundTitle: "Page introuvable",
    notFoundBody: "La page que vous cherchez n'existe pas ou a été déplacée.",
    genericTitle: "Une erreur est survenue",
    genericBody: "Quelque chose s'est mal passé. Veuillez réessayer dans un instant.",
  },
};

export type Dictionary = typeof fr;
