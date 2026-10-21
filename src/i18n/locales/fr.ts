export const fr = {
  common: {
    loading: 'Chargement…',
    startupError: 'L’application n’a pas pu démarrer.',
    close: 'Fermer',
  },
  validation: {
    required: 'Ce champ est obligatoire.',
    tooLong: 'Ce texte est trop long.',
    invalidEmail: 'Adresse e-mail invalide.',
    passwordTooShort: 'Le mot de passe doit contenir au moins 6 caractères.',
  },
  auth: {
    fields: {
      displayName: 'Prénom',
      email: 'E-mail',
      password: 'Mot de passe',
      preferredLanguage: 'Langue préférée',
    },
    signUp: {
      title: 'Créer un compte',
      submit: 'Créer mon compte',
      hasAccount: 'Déjà un compte ?',
    },
    login: {
      title: 'Connexion',
      submit: 'Se connecter',
      link: 'Se connecter',
      noAccount: 'Pas encore de compte ?',
      signUpLink: 'Créer un compte',
      forgotPassword: 'Mot de passe oublié ?',
    },
    forgotPassword: {
      title: 'Mot de passe oublié',
      submit: 'Envoyer le lien',
      sent: 'Si un compte existe pour cette adresse, un e-mail de réinitialisation vient d’être envoyé.',
      checkSpam: 'Tu ne le vois pas ? Pense à vérifier tes spams.',
      backToLogin: 'Retour à la connexion',
    },
    logout: 'Se déconnecter',
    errors: {
      emailInUse: 'Un compte existe déjà avec cette adresse e-mail.',
      invalidEmail: 'Adresse e-mail invalide.',
      weakPassword: 'Mot de passe trop faible (6 caractères minimum).',
      invalidCredential: 'E-mail ou mot de passe incorrect.',
      tooManyRequests: 'Trop de tentatives. Réessaie dans quelques minutes.',
      network: 'Problème de connexion internet.',
      unknown: 'Une erreur est survenue. Réessaie.',
    },
  },
  dashboard: {
    hello: 'Bonjour 👋',
    connectedAs: 'Connectée avec {{email}}',
    welcomeEmailSent: 'Ton compte est créé 🎉 Un e-mail de bienvenue t’attend : vérifie ta boîte mail 💌',
  },
}
