/*
 * Consumer Portal runtime translation (prototype).
 *
 * The language selector in the sidebar (sidebar.js) sets <html lang> and fires
 * "consumer-language-change". This script then swaps every known English UI string for its
 * translation: text nodes, plus placeholder / aria-label / title / alt / tooltip attributes.
 * Originals are remembered, so switching back to English restores the page exactly.
 * A MutationObserver translates content rendered later (tables, modals, popovers).
 *
 * Supported: "fr-CA" (French, Canada, built in) and "es" (Spanish, consumer-i18n-es.js pack).
 * Add a language: add a pack file like consumer-i18n-es.js (dict + nav + rules) and load it before this file.
 * Unknown strings are left in English. Brand names (Transcard, SMART Exchange, Consumer Portal,
 * Visa, Mastercard…), legal text, US state names and user data are intentionally not translated.
 */
(function () {
  "use strict";

  var NBSP = " ";

  var DICT = {
    "fr-CA": {
      /* ---- Shell: sidebar, footer, help ---- */
      "Payments Received": "Paiements reçus",
      "My Cards": "Mes cartes",
      "Payment Preferences": "Préférences de paiement",
      "My Profile": "Mon profil",
      "Insights": "Analyses",
      "Help from Transcard": "Aide de Transcard",
      "Terms of Use": "Conditions d'utilisation",
      "Privacy Policy": "Politique de confidentialité",
      "Support Team": "Équipe de soutien",
      "Email": "Courriel",
      "Call": "Appeler",
      "Collapse": "Réduire",
      "Collapse sidebar": "Réduire la barre latérale",
      "Expand sidebar": "Développer la barre latérale",
      "Expand": "Développer",
      "Close sidebar": "Fermer la barre latérale",
      "Language": "Langue",
      "Contact Support": "Joindre le soutien",
      "FAQ & User Guides →": "FAQ et guides de l'utilisateur →",
      "Your Account Information": "Les renseignements de votre compte",

      /* ---- Generic actions ---- */
      "Cancel": "Annuler",
      "Save": "Enregistrer",
      "Save Changes": "Enregistrer les modifications",
      "Close": "Fermer",
      "Back": "Retour",
      "Back to My Cards": "Retour à Mes cartes",
      "Add": "Ajouter",
      "Edit": "Modifier",
      "Update": "Mettre à jour",
      "Delete": "Supprimer",
      "Confirm": "Confirmer",
      "Done": "Terminé",
      "Verify": "Vérifier",
      "Search": "Rechercher",
      "Filter": "Filtrer",
      "Refresh": "Actualiser",
      "Reset": "Réinitialiser",
      "Apply": "Appliquer",
      "Export": "Exporter",
      "Download": "Télécharger",
      "Download Details": "Télécharger les détails",
      "Previous": "Précédent",
      "Next": "Suivant",
      "Open": "Ouvrir",
      "Review": "Examiner",
      "Reviewed": "Examiné",
      "Clear": "Effacer",
      "Clear all": "Tout effacer",
      "Customize": "Personnaliser",
      "Dismiss notification": "Fermer la notification",
      "Optional": "Facultatif",
      "Loading...": "Chargement…",
      "Show all": "Tout afficher",
      "Skip for now": "Passer pour l'instant",
      "Remind me later": "Me le rappeler plus tard",
      "Thank you!": "Merci!",
      "You": "Vous",
      "and": "et",
      "or": "ou",
      "of": "de",
      "From": "De",
      "To": "À",
      "Name": "Nom",
      "Type": "Type",
      "Status": "Statut",
      "Notes": "Notes",
      "Details": "Détails",
      "Action": "Action",
      "Open options": "Ouvrir les options",
      "Select all": "Tout sélectionner",
      "Remove filter": "Retirer le filtre",
      "Remove row": "Supprimer la ligne",
      "Rows per page:": "Lignes par page" + NBSP + ":",
      "Rows per Page:": "Lignes par page" + NBSP + ":",
      "Showing": "Affichage de",
      "results": "résultats",
      "Pagination": "Pagination",
      "First page": "Première page",
      "Previous page": "Page précédente",
      "Next page": "Page suivante",
      "Last page": "Dernière page",
      "Expand row": "Développer la ligne",
      "Reorder column": "Réorganiser la colonne",
      "Select a tab": "Sélectionner un onglet",
      "Tabs": "Onglets",
      "Please Wait": "Veuillez patienter",
      "Search customer": "Rechercher un client",
      "Search cards": "Rechercher des cartes",
      "Search payer": "Rechercher un payeur",
      "Search transactions": "Rechercher des transactions",
      "Close contact details": "Fermer les coordonnées",

      /* ---- Payments Received ---- */
      "Get Paid": "Se faire payer",
      "Get paid": "Se faire payer",
      "Mark as paid": "Marquer comme payé",
      "Mark Payment as Paid": "Marquer le paiement comme payé",
      "You are about to change the status of this payment to Paid. Are you sure you want to continue?":
        "Vous êtes sur le point de changer le statut de ce paiement à Payé. Voulez-vous vraiment continuer?",
      "Pending Your Action": "En attente de votre action",
      "Pending Payment": "Paiement en attente",
      "Pending": "En attente",
      "Paid": "Payé",
      "Exceptions": "Exceptions",
      "0 Payments": "0 paiement",
      "Payer": "Payeur",
      "Payer Name": "Nom du payeur",
      "Customer": "Client",
      "Failure Reason": "Motif de l'échec",
      "Date Processed": "Date de traitement",
      "Date Initiated": "Date de lancement",
      "Invoice #": "N° de facture",
      "Declining reason": "Motif du refus",
      "Declining Reason": "Motif du refus",
      "Declining Date": "Date du refus",
      "Decline": "Refuser",
      "Decline Payment": "Refuser le paiement",
      "Decline reason:": "Motif du refus" + NBSP + ":",
      "By selecting Decline Payment below, your payment will be declined and": "En sélectionnant Refuser le paiement ci-dessous, votre paiement sera refusé et",
      "will be notified.": "en sera informé.",
      "Reason": "Motif",
      "Select the reason": "Sélectionnez le motif",
      "Additional Note": "Note supplémentaire",
      "Please provide more details": "Veuillez fournir plus de détails",
      "Zero balance acct (patient does not owe on the acct)": "Compte à solde nul (le patient ne doit rien sur le compte)",
      "Unable to post": "Impossible d'inscrire le paiement",
      "Invalid Provider": "Fournisseur non valide",
      "Unable to locate acct": "Impossible de trouver le compte",
      "Duplicate payment creates a credit balance.": "Le paiement en double crée un solde créditeur.",
      "Account charge off (sent to collections)": "Compte radié (envoyé au recouvrement)",
      "Could not allocate to guarantor": "Impossible d'affecter au garant",
      "Remit Rejected": "Remise rejetée",
      "Other": "Autre",
      "Follow these easy steps to Get Paid:": "Suivez ces étapes simples pour être payé" + NBSP + ":",
      "Review Documents": "Examiner les documents",
      "Review Document": "Examiner le document",
      "Please read the document below before continuing.": "Veuillez lire le document ci-dessous avant de continuer.",
      "Document": "Document",
      "Signature": "Signature",
      "Provide Signature": "Fournir une signature",
      "Signed": "Signé",
      "Signature mode": "Mode de signature",
      "Draw": "Dessiner",
      "Type your full name": "Saisissez votre nom complet",
      "Your Full Name": "Votre nom complet",
      "Your full name": "Votre nom complet",
      "Full name": "Nom complet",
      "Sign": "Signer",
      "Select Payment Method": "Sélectionner un mode de paiement",
      "Method of Payment": "Mode de paiement",
      "Funds expected instantly": "Fonds attendus instantanément",
      "Send to my Bank Account": "Envoyer à mon compte bancaire",
      "Expected from instantly up to 3 days": "Attendu de façon instantanée jusqu'à 3 jours",
      "I want a check": "Je veux un chèque",
      "Slowest payment method": "Mode de paiement le plus lent",
      "Cardholder Details": "Renseignements du titulaire de la carte",
      "Reveal Card Details": "Afficher les détails de la carte",
      "Reveal Details": "Afficher les détails",
      "Set card as default for future payments": "Définir la carte par défaut pour les paiements futurs",
      "Select bank account": "Sélectionner un compte bancaire",
      "Account Details": "Détails du compte",
      "Set bank account as default for future payments": "Définir le compte bancaire par défaut pour les paiements futurs",
      "Select mailing address": "Sélectionner une adresse postale",
      "Mailing Address": "Adresse postale",
      "Recipient Name": "Nom du destinataire",
      "Set paper check as default for future payments": "Définir le chèque papier par défaut pour les paiements futurs",
      "Confirm and Submit": "Confirmer et soumettre",
      "Submit and Get Paid": "Soumettre et se faire payer",
      "Confirm your payment details": "Confirmez les détails de votre paiement",
      "Once submitted, this payment cannot be reversed or edited.": "Une fois soumis, ce paiement ne peut être ni annulé ni modifié.",
      "Payment Summary": "Résumé du paiement",
      "Amount": "Montant",
      "Payment Method": "Mode de paiement",
      "Destination": "Destination",
      "I confirm the details above are correct and understand this payment is final.": "Je confirme que les détails ci-dessus sont exacts et je comprends que ce paiement est définitif.",
      "Receivable Summary": "Résumé des créances",
      "No receivable details available.": "Aucun détail de créance disponible.",
      "Activity Log": "Journal d'activité",
      "Successfully Submitted!": "Soumis avec succès!",
      "Transaction ID": "ID de transaction",
      "Payment date": "Date du paiement",
      "Payment method": "Mode de paiement",
      "Bank account": "Compte bancaire",
      "Send check to": "Envoyer le chèque à",
      "Sent by": "Envoyé par",
      "Single-Party Payment": "Paiement à une seule partie",
      "Payee Name": "Nom du bénéficiaire",
      "No payment method selected": "Aucun mode de paiement sélectionné",
      "View details": "Voir les détails",
      "View card details": "Voir les détails de la carte",
      "Attachments": "Pièces jointes",
      "Card Details": "Détails de la carte",
      "Use This Card in Your Terminal": "Utiliser cette carte dans votre terminal",
      "Take these card details and run the payment through your terminal like a regular card charge.": "Prenez ces détails de carte et traitez le paiement dans votre terminal comme un débit de carte ordinaire.",
      "to verify this payment card information and continue setup.": "pour vérifier les renseignements de cette carte de paiement et poursuivre la configuration.",
      "Choose Any of These Payments": "Choisissez l'un de ces paiements",
      "Start with any highlighted card payment to connect your terminal and begin the setup flow.": "Commencez par n'importe quel paiement par carte en surbrillance pour connecter votre terminal et lancer la configuration.",
      "No document review is required for this payment.": "Aucun examen de document n'est requis pour ce paiement.",
      "Quantity": "Quantité",
      "Unit price": "Prix unitaire",
      "The account is being verified. This may take a few moments.": "Le compte est en cours de vérification. Cela peut prendre quelques instants.",
      "Unable to Verify Account Details": "Impossible de vérifier les détails du compte",
      "Please select a different verified Bank Account, or add a new one.": "Veuillez sélectionner un autre compte bancaire vérifié ou en ajouter un nouveau.",
      "Add New Bank Account": "Ajouter un nouveau compte bancaire",
      "Unable to Verify Method of Payment": "Impossible de vérifier le mode de paiement",
      "Verified account": "Compte vérifié",
      "This account has not been yet verified.": "Ce compte n'a pas encore été vérifié.",
      "Manage columns": "Gérer les colonnes",
      "Choose which columns appear in the payments table.": "Choisissez les colonnes à afficher dans le tableau des paiements.",
      "Reset default": "Rétablir les valeurs par défaut",
      "Apply changes": "Appliquer les modifications",
      "Payment method unavailable, exceeded maximum number of validation attempts.": "Mode de paiement non disponible : le nombre maximal de tentatives de validation a été dépassé.",
      "Fraud Score": "Cote de fraude",
      "Last fraud score:": "Dernière cote de fraude" + NBSP + ":",
      "Last account validation:": "Dernière validation du compte" + NBSP + ":",
      "Bank": "Banque",
      "Merchant Details": "Détails du marchand",
      "Transaction Details": "Détails de la transaction",
      "Transaction details": "Détails de la transaction",
      "Card Transaction History": "Historique des transactions de la carte",
      "No transactions match": "Aucune transaction ne correspond",
      "Try a different search or clear the filter.": "Essayez une autre recherche ou effacez le filtre.",
      "For dispute request you can contact:": "Pour une demande de contestation, vous pouvez communiquer avec" + NBSP + ":",

      /* ---- My Cards ---- */
      "Active only": "Actives seulement",
      "Contact Details": "Coordonnées",
      "Email Address": "Adresse courriel",
      "Phone Number": "Numéro de téléphone",
      "Available Balance": "Solde disponible",
      "Current Balance": "Solde actuel",
      "Copy admin number": "Copier le numéro administratif",
      "Card actions": "Actions de la carte",
      "Cardholder Name": "Nom du titulaire de la carte",
      "Cardholder Address": "Adresse du titulaire de la carte",
      "Card Number": "Numéro de carte",
      "Expires": "Expiration",
      "EXPIRATION": "EXPIRATION",
      "DATE": "DATE",
      "Valid": "Valide",
      "Thru": "Jusqu'au",
      "CVC2": "CVC2",
      "Add number": "Ajouter un numéro",
      "How can you use the payer's card?": "Comment pouvez-vous utiliser la carte du payeur?",
      "The payer has provided their card to cover a specific amount. You are only authorized to charge the amount indicated. To process the payment, enter the card details into your card terminal.": "Le payeur a fourni sa carte pour couvrir un montant précis. Vous n'êtes autorisé à débiter que le montant indiqué. Pour traiter le paiement, saisissez les détails de la carte dans votre terminal.",
      "The card may also be used for future authorized payments.": "La carte peut aussi servir à des paiements futurs autorisés.",
      "The card may also be used for future authorized payments. It can be securely stored under the Payment Preference tab in the SMART Exchange.": "La carte peut aussi servir à des paiements futurs autorisés. Elle peut être conservée en toute sécurité sous l'onglet Préférences de paiement de SMART Exchange.",
      "It can be securely stored under the": "Elle peut être conservée en toute sécurité sous l'onglet",
      "Payment Preference": "Préférences de paiement",
      "tab in the": "dans",

      /* ---- My Profile ---- */
      "Please provide your information below.": "Veuillez fournir vos renseignements ci-dessous.",
      "Alerts": "Alertes",
      "Sign up for email and SMS messages about your account.": "Inscrivez-vous pour recevoir des courriels et des messages texte au sujet de votre compte.",
      "Critical alerts": "Alertes critiques",
      "Require action — receipt approval, digital signature, or a possible security issue.": "Nécessitent une action : approbation d'un reçu, signature numérique ou problème de sécurité possible.",
      "Account alerts": "Alertes de compte",
      "Activity on your account — deposits and transactions.": "Activité sur votre compte : dépôts et transactions.",
      "Email / Username": "Courriel / nom d'utilisateur",
      "Phone": "Téléphone",
      "Password": "Mot de passe",
      "Reset Password": "Réinitialiser le mot de passe",
      "Current password": "Mot de passe actuel",
      "New password": "Nouveau mot de passe",
      "Confirm new password": "Confirmer le nouveau mot de passe",
      "Edit email": "Modifier le courriel",
      "Edit mobile number": "Modifier le numéro de cellulaire",

      /* ---- Payment Preferences ---- */
      "Payment Methods": "Modes de paiement",
      "Global Preferences": "Préférences globales",
      "Advanced Settings": "Paramètres avancés",
      "Payment Account Details": "Détails du compte de paiement",
      "Account details for payment acceptance.": "Détails du compte pour l'acceptation des paiements.",
      "Bank Accounts": "Comptes bancaires",
      "No Bank Accounts": "Aucun compte bancaire",
      "Get started by adding a new bank account.": "Commencez par ajouter un nouveau compte bancaire.",
      "Add Bank Account": "Ajouter un compte bancaire",
      "Edit Bank Account": "Modifier le compte bancaire",
      "Address for Checks": "Adresse pour les chèques",
      "No Check Addresses": "Aucune adresse pour les chèques",
      "No mailing addresses found.": "Aucune adresse postale trouvée.",
      "Add Address": "Ajouter une adresse",
      "Edit Address": "Modifier l'adresse",
      "Set Default Payment Methods": "Définir les modes de paiement par défaut",
      "Set the order of payment preferences. If the primary method is not supported by the payer, we will automatically default to the next choice.": "Définissez l'ordre de vos préférences de paiement. Si le mode principal n'est pas pris en charge par le payeur, nous utiliserons automatiquement le choix suivant.",
      "Payer specific payment preferences can be set within Advanced Settings.": "Les préférences de paiement propres à un payeur se définissent dans les paramètres avancés.",
      "Select payment method": "Sélectionner un mode de paiement",
      "Accept Card Payment": "Accepter le paiement par carte",
      "No bank account details required, immediate": "Aucun détail de compte bancaire requis, immédiat",
      "Check": "Chèque",
      "Customize Default Preferences by Payer": "Personnaliser les préférences par défaut selon le payeur",
      "Global Preferences will remain the same for all other payers.": "Les préférences globales resteront les mêmes pour tous les autres payeurs.",
      "No payer specific payment preferences added.": "Aucune préférence de paiement propre à un payeur n'a été ajoutée.",
      "Primary Method of Payment": "Mode de paiement principal",
      "Secondary Method of Payment": "Mode de paiement secondaire",
      "Third Method of Payment": "Troisième mode de paiement",
      "Select payer": "Sélectionner un payeur",
      "Customize another payer": "Personnaliser un autre payeur",
      "Account Information": "Renseignements du compte",
      "Name on Account": "Nom sur le compte",
      "Routing Number": "Numéro d'acheminement",
      "Account Number": "Numéro de compte",
      "Confirm Account Number": "Confirmer le numéro de compte",
      "Account Nickname": "Surnom du compte",
      "Account Name": "Nom du compte",
      "e.g. Primary Account": "p. ex. Compte principal",
      "Address": "Adresse",
      "Country": "Pays",
      "United States": "États-Unis",
      "Mexico": "Mexique",
      "United Kingdom": "Royaume-Uni",
      "Australia": "Australie",
      "Germany": "Allemagne",
      "Address Line 1": "Adresse, ligne 1",
      "Address Line 2": "Adresse, ligne 2",
      "Address Line 3": "Adresse, ligne 3",
      "Address Nickname": "Surnom de l'adresse",
      "Suite, floor, unit…": "Bureau, étage, unité…",
      "City": "Ville",
      "State / Province": "État / province",
      "State/Province": "État / province",
      "Zip / Postal Code": "Code postal",
      "Zip/Postal Code": "Code postal",
      "Set as default for future payments": "Définir par défaut pour les paiements futurs",
      "The default account is preselected for future payments.": "Le compte par défaut est présélectionné pour les paiements futurs.",
      "Delete Bank Account?": "Supprimer le compte bancaire?",
      "If you delete this bank account it will be removed as a payment option for receiving payments.": "Si vous supprimez ce compte bancaire, il ne sera plus offert comme option pour recevoir des paiements.",
      "Delete Check Address?": "Supprimer l'adresse pour les chèques?",
      "If you delete this check address it will be removed as a payment option for receiving payments.": "Si vous supprimez cette adresse pour les chèques, elle ne sera plus offerte comme option pour recevoir des paiements.",
      "Are you sure you want to opt out of Automatic Card Processing?": "Voulez-vous vraiment vous retirer du traitement automatique des cartes?",
      "By opting out, card payments will not be automatically processed and you will need to manually key in the card info.": "En vous retirant, les paiements par carte ne seront plus traités automatiquement et vous devrez saisir manuellement les renseignements de la carte.",
      "Yes, opt out": "Oui, me retirer",
      "Enable Automatic Card Processing": "Activer le traitement automatique des cartes",
      "When enabled, eligible virtual card payments will be processed automatically through your existing merchant processor.": "Lorsqu'il est activé, les paiements admissibles par carte virtuelle seront traités automatiquement par votre processeur marchand actuel.",
      "How it works": "Comment ça fonctionne",
      "Eligible virtual card payments are securely transmitted to your processor.": "Les paiements admissibles par carte virtuelle sont transmis de façon sécuritaire à votre processeur.",
      "Funds settle as usual.": "Les fonds sont réglés comme d'habitude.",
      "You can turn this off anytime.": "Vous pouvez désactiver cette option en tout temps.",
      "I agree to the Visa AR Manager": "J'accepte l'entente de participation",
      "Participation Agreement": "de Visa AR Manager",
      "To enable automatic card processing, complete the steps below.": "Pour activer le traitement automatique des cartes, suivez les étapes ci-dessous.",
      "Process Any Payment": "Traiter un paiement",
      "Go to your": "Allez à vos",
      "Payments": "paiements",
      "and process any available virtual card using your terminal.": "et traitez n'importe quelle carte virtuelle disponible avec votre terminal.",
      "This links your Merchant and Terminal IDs.": "Cela relie vos identifiants de marchand et de terminal.",
      "Go to Payments": "Aller aux paiements",
      "Terminal Verification": "Vérification du terminal",
      "Verify Your Bank Account (Penny Test)": "Vérifier votre compte bancaire (test du cent)",
      "Automatic Card Processing Activated": "Traitement automatique des cartes activé",
      "Bank Account Verification": "Vérification du compte bancaire",
      "This step ensures funds are settling to your account. Once the deposit amount is confirmed, set up for automatic card processing will be complete.": "Cette étape confirme que les fonds sont réglés dans votre compte. Une fois le montant du dépôt confirmé, la configuration du traitement automatique des cartes sera terminée.",
      "Enter exact deposit amount": "Saisissez le montant exact du dépôt",
      "Only numbers and one decimal point are allowed.": "Seuls les chiffres et une virgule décimale sont autorisés.",
      "Bank Account Verified Successfully!": "Compte bancaire vérifié avec succès!",
      "Automatic card processing is set up, card payments will be processed automatically and you'll receive a notification.": "Le traitement automatique des cartes est configuré : les paiements par carte seront traités automatiquement et vous recevrez une notification.",

      /* ---- Topbar ---- */
      "Hello,": "Bonjour,",
      "Dashboard": "Tableau de bord",
      "Home": "Accueil",
      "Breadcrumb": "Chemin de navigation",
      "Switch view": "Changer de vue",
      "Business Details": "Détails de l'entreprise",
      "Sign Out": "Se déconnecter",
      "Notifications": "Notifications",
      "Close notifications": "Fermer les notifications",
      "Open sidebar": "Ouvrir la barre latérale",
      "Select business": "Sélectionner une entreprise",
      "Open user menu": "Ouvrir le menu utilisateur",
      "Attention needed": "Attention requise",
      "Pay Now": "Payer maintenant",
      "Notification Modal": "Fenêtre des notifications",
      "Onboard for a Different Business": "Inscrire une autre entreprise",
      "Learn more": "En savoir plus",

      /* ---- Account menu / shell ---- */
      "Role": "Rôle",
      "Profile": "Profil",
      "Dark mode": "Mode sombre",
      "Sign out": "Se déconnecter",
      "Consumer view": "Vue consommateur",
      "Transcard view": "Vue Transcard",
      "Supplier view": "Vue fournisseur",
      "Buyer view": "Vue acheteur",
      "You can go to your account enrollment portal to update your business information or upgrade your product with additional features.": "Vous pouvez accéder à votre portail d'inscription pour mettre à jour les renseignements de votre entreprise ou ajouter des fonctionnalités à votre produit.",
      "Current Features": "Fonctionnalités actuelles",
      "Enable More Features": "Activer d'autres fonctionnalités",
      "Go to enrollment portal": "Aller au portail d'inscription",
      "Supply Chain Financing": "Financement de la chaîne d'approvisionnement",
      "Merchant Services": "Services aux marchands",
      "No mobile": "Aucun cellulaire",
      "Payment Reference": "Référence de paiement",
      "payment failed — ach transfer returned by bank (r03)": "échec du paiement : virement ACH retourné par la banque (R03)",
      "payment failed — bank account could not be verified": "échec du paiement : le compte bancaire n'a pas pu être vérifié",
      "payment failed — card declined at redemption": "échec du paiement : carte refusée lors de l'encaissement",
      "payment failed — name on account does not match payee": "échec du paiement : le nom sur le compte ne correspond pas au bénéficiaire",
      "payment failed — payment voided by payer": "échec du paiement : paiement annulé par le payeur",
      "payment failed — virtual card expired before it was used": "échec du paiement : la carte virtuelle a expiré avant d'être utilisée",

      /* ---- Action feedback (toasts) ---- */
      "Automatic Card Processing has been opted out.": "Vous vous êtes retiré du traitement automatique des cartes.",
      "Mobile number added — you can now turn on text alerts": "Numéro de cellulaire ajouté : vous pouvez maintenant activer les alertes par message texte",

      /* ---- Activity log (fragments around the invoice link) ---- */
      "Initiated": "Lancé",
      "Declined": "Refusé",
      "Payment Failed": "Échec du paiement",
      "Pending ACH Settlement": "Règlement ACH en attente",
      "Pending Manual Confirmation": "Confirmation manuelle en attente",
      "Please review the required items before you get paid.": "Veuillez vérifier les éléments requis avant de recevoir votre paiement.",
      "Payment with id": "Le paiement portant l'ID",
      "Payment for invoice": "Le paiement de la facture",
      "has been initiated": "a été lancé",
      "has been processed": "a été traité",
      "was declined.": "a été refusé.",
      "has failed.": "a échoué.",
      "ACH settlement is processing and is expected to complete by": "Le règlement ACH est en cours et devrait être terminé d'ici le",
      "ACH settlement is processing and will complete automatically after the standard ACH window.": "Le règlement ACH est en cours et se terminera automatiquement après le délai ACH habituel.",
      "Card details have been provided. Mark this payment as paid once funds are confirmed.": "Les détails de la carte ont été fournis. Marquez ce paiement comme payé une fois les fonds confirmés.",
      "ACH is processing automatically. Standard ACH processing time is typically 1-2 business days.": "Le traitement ACH est automatique. Le délai de traitement ACH habituel est de 1 à 2 jours ouvrables.",
      "completed ACH settlement": "règlement ACH terminé",
      "System": "Système",

      /* ---- Table: statuses, methods, details, empty states ---- */
      "Action Required": "Action requise",
      "Processing": "En traitement",
      "Exception": "Exception",
      "Failed": "Échoué",
      "Card": "Carte",
      "Card Payment": "Paiement par carte",
      "Payer's Card": "Carte du payeur",
      "Accept Payer's Card": "Accepter la carte du payeur",
      "ACH": "ACH",
      "Bank Transfer": "Virement bancaire",
      "Send to Bank Account": "Envoyer au compte bancaire",
      "Send to My Bank": "Envoyer à ma banque",
      "Request a Paper Check": "Demander un chèque papier",
      "Customers Card": "Carte du client",
      "Account": "Compte",
      "Bank Account": "Compte bancaire",
      "My Bank Account": "Mon compte bancaire",
      "Account Validation": "Validation du compte",
      "Last account validation": "Dernière validation du compte",
      "Payment Method Details": "Détails du mode de paiement",
      "Check Details": "Détails du chèque",
      "Check Number": "Numéro du chèque",
      "Check number": "Numéro du chèque",
      "Mailed Date": "Date d'envoi",
      "Mailed date": "Date d'envoi",
      "Payee": "Bénéficiaire",
      "Exchange Details": "Détails de l'échange",
      "Exchange ID": "ID de l'échange",
      "Exchange Rate": "Taux de change",
      "Source Amount": "Montant source",
      "Target Amount": "Montant cible",
      "Settlement Date": "Date de règlement",
      "Account number": "Numéro de compte",
      "Card number": "Numéro de carte",
      "Payment details": "Détails du paiement",
      "No Payment Method Selected": "Aucun mode de paiement sélectionné",
      "No payment method selected yet. Click 'Get paid' to choose how you want to be paid.": "Aucun mode de paiement n'a encore été sélectionné. Cliquez sur « Se faire payer » pour choisir comment vous voulez être payé.",
      "Payment was declined and needs review.": "Le paiement a été refusé et doit être examiné.",
      "Payment is in exception state and requires review.": "Le paiement est en situation d'exception et doit être examiné.",
      "Declined:": "Refusé" + NBSP + ":",
      "Hide Details": "Masquer les détails",
      "Show less": "Afficher moins",
      "Show more": "Afficher plus",
      "… Show more": "… Afficher plus",
      "Loading document…": "Chargement du document…",
      "You are all caught up": "Vous êtes à jour",
      "No exchange records found": "Aucun enregistrement d'échange trouvé",
      "No payments are waiting on your confirmation right now.": "Aucun paiement n'attend votre confirmation pour le moment.",
      "Try a different search or adjust the active filters to see matching invoices.": "Essayez une autre recherche ou modifiez les filtres actifs pour voir les factures correspondantes.",
      "Data synced. You're up to date.": "Données synchronisées. Vous êtes à jour.",
      "Any": "Tous",
      "Payment": "Paiement",
      "Close payments guide": "Fermer le guide des paiements",
      "Step": "Étape",
      "Open View details to verify this payment card information and continue setup.": "Ouvrez Voir les détails pour vérifier les renseignements de cette carte de paiement et poursuivre la configuration.",

      /* ---- Get Paid: validation, toasts, confirmations ---- */
      "There is a problem with the account details you provided. Please contact": "Il y a un problème avec les détails du compte que vous avez fournis. Veuillez communiquer avec",
      "for details.": "pour en savoir plus.",
      "We have notified your customer. If you have any questions, please contact": "Nous avons avisé votre client. Si vous avez des questions, veuillez communiquer avec",
      "Contact": "Communiquer avec",
      "by emailing": "par courriel à",
      "The account and/or routing number provided could not be verified. Please review and try again.": "Le numéro de compte ou d'acheminement fourni n'a pas pu être vérifié. Veuillez vérifier et réessayer.",
      "Payment marked as paid.": "Paiement marqué comme payé.",
      "Payment declined.": "Paiement refusé.",
      "declined the payment": "a refusé le paiement",
      "the client": "le client",
      "Additional Note is required.": "La note supplémentaire est obligatoire.",
      "Invoice:": "Facture" + NBSP + ":",
      "Payer:": "Payeur" + NBSP + ":",
      "Amount:": "Montant" + NBSP + ":",
      "Mark as Paid": "Marquer comme payé",
      "Copied to clipboard": "Copié dans le presse-papiers",
      "Statement downloaded": "Relevé téléchargé",
      "New card requested — we'll email you when it's ready": "Nouvelle carte demandée : nous vous enverrons un courriel lorsqu'elle sera prête",

      /* ---- My Cards ---- */
      "Card Provider": "Émetteur de la carte",
      "Expiration": "Expiration",
      "No cards match": "Aucune carte ne correspond",
      "No cards yet": "Aucune carte pour l'instant",
      "Try a different search or clear the filters.": "Essayez une autre recherche ou effacez les filtres.",
      "Cards appear here when you claim a payment to a virtual card.": "Les cartes apparaissent ici lorsque vous réclamez un paiement sur une carte virtuelle.",
      "Active": "Active",
      "Inactive": "Inactive",
      "Valid Thru": "Valide jusqu'au",
      "CVC": "CVC",
      "Admin Number": "Numéro administratif",
      "Name on Card": "Nom sur la carte",
      "Card Name": "Nom de la carte",
      "Created": "Créée",
      "Payment Network": "Réseau de paiement",
      "Settled": "Réglée",
      "Refunded": "Remboursée",
      "Card statement": "Relevé de carte",
      "Request new card": "Demander une nouvelle carte",
      "Dispute a transaction": "Contester une transaction",
      "Transaction Code": "Code de transaction",
      "Response Code": "Code de réponse",
      "Response Description": "Description de la réponse",
      "Merchant Category Code": "Code de catégorie de marchand",
      "Transaction Type": "Type de transaction",
      "Merchant Location": "Emplacement du marchand",
      "Fee": "Frais",
      "Date": "Date",
      "Merchant": "Marchand",
      "Amount (USD)": "Montant (USD)",
      "Fee (USD)": "Frais (USD)",
      "No transactions match Try a different search or clear the filter.": "Aucune transaction ne correspond. Essayez une autre recherche ou effacez le filtre.",
      "For dispute request you can contact: 800-890-3128 or dispute-ticket@transcard.com": "Pour une demande de contestation, vous pouvez communiquer avec" + NBSP + ": 800-890-3128 ou dispute-ticket@transcard.com",

      /* ---- My Profile ---- */
      "Reset password": "Réinitialiser le mot de passe",
      "Update password": "Mettre à jour le mot de passe",
      "Password updated": "Mot de passe mis à jour",
      "Enter your full name.": "Saisissez votre nom complet.",
      "Enter a valid email address.": "Saisissez une adresse courriel valide.",
      "Enter a 10-digit US mobile number.": "Saisissez un numéro de cellulaire américain à 10 chiffres.",
      "Text message (SMS)": "Message texte (SMS)",
      "Enter your current password.": "Saisissez votre mot de passe actuel.",
      "Use at least 8 characters.": "Utilisez au moins 8 caractères.",
      "Choose a password different from your current one.": "Choisissez un mot de passe différent de l'actuel.",
      "Passwords don't match.": "Les mots de passe ne correspondent pas.",

      /* ---- Cards / documents ---- */
      "Name on Debit Card": "Nom sur la carte de débit",
      "Debit Card Number": "Numéro de la carte de débit",
      "The form is unavailable right now. Please try again later.": "Le formulaire n'est pas disponible pour le moment. Veuillez réessayer plus tard.",
      "Documents are unavailable right now. Please try again later.": "Les documents ne sont pas disponibles pour le moment. Veuillez réessayer plus tard.",
      "3. Review Documents": "3. Examiner les documents",
      "Page": "Page",
      "Enter a minimum of": "Saisissez un minimum de",
      "and a maximum of": "et un maximum de",
    }
  };

  var MONTHS_FR = {
    january: "janvier", jan: "janv.", february: "février", feb: "févr.", march: "mars", mar: "mars",
    april: "avril", apr: "avr.", may: "mai", june: "juin", jun: "juin", july: "juillet", jul: "juill.",
    august: "août", aug: "août", september: "septembre", sep: "sept.", sept: "sept.", october: "octobre",
    oct: "oct.", november: "novembre", nov: "nov.", december: "décembre", dec: "déc."
  };
  var TZ_FR = { EST: "HNE", EDT: "HAE", CST: "HNC", CDT: "HAC", MST: "HNR", MDT: "HAR", PST: "HNP", PDT: "HAP", UTC: "UTC" };
  /* "June 30, 2024", "Jun 30, 2024", "June 30, 2024 10:40 AM (EST)" -> "30 juin 2024", "30 juin 2024, 10 h 40 (HNE)" */
  var DATE_RE = /^([A-Za-z]{3,9})\.? (\d{1,2}), (\d{4})(?:,? (\d{1,2}):(\d{2}) ?(AM|PM)(?: \(([A-Z]{2,4})\))?)?$/;
  function frDate(str) {
    var m = DATE_RE.exec(norm(str));
    if (!m || !MONTHS_FR[m[1].toLowerCase()]) return str;
    var out = (+m[2] === 1 ? "1er" : m[2]) + " " + MONTHS_FR[m[1].toLowerCase()] + " " + m[3];
    if (m[4]) {
      var h = +m[4] % 12 + (m[6] === "PM" ? 12 : 0);
      out += ", " + h + " h " + m[5] + (m[7] ? " (" + (TZ_FR[m[7]] || m[7]) + ")" : "");
    }
    return out;
  }

  /* Pattern rules for strings that mix fixed words and data. Each: [regex, replacement]. */
  var RULES = {
    "fr-CA": [
      [/^(\d+) Payments$/, function (m, n) { return n + (+n > 1 ? " paiements" : " paiement"); }],
      [/^(\d+) of (\d+)$/, "$1 de $2"],
      [/^Item \((\d+)\)$/, "Article ($1)"],
      [/^(.+) Account (••••\d+)$/, "Compte $1 $2"],
      [/^Showing (\d+) to (\d+) of (\d+) results?$/, "Affichage de $1 à $2 sur $3 résultats"],
      [/^(\d+) unpaid Invoices? (?:are|is) due today\.$/, function (m, n) { return n + (+n > 1 ? " factures impayées sont dues" : " facture impayée est due") + " aujourd'hui."; }],
      [/^Notifications, (\d+) unread$/, function (m, n) { return "Notifications, " + n + (+n > 1 ? " non lues" : " non lue"); }],
      [/^Last (\d+) days$/, "Les $1 derniers jours"],
      [/^has been (processed|initiated) on (.+)$/, function (m, v, d) { return (v === "processed" ? "a été traité" : "a été lancé") + " le " + frDate(d); }],
      [/^Reason: (.+)$/, function (m, r) { return "Motif" + NBSP + ": " + (lookup(r) || r); }],
      [/^Show all \((\d+)\)$/, "Tout afficher ($1)"],
      [/^Enter a minimum of (\d+) and a maximum of (\d+) characters\.$/, "Saisissez entre $1 et $2 caractères."],
      [/^(Added|Updated|Deleted) bank account "(.+)"\.$/, function (m, v, n) { return "Compte bancaire « " + n + " » " + (v === "Added" ? "ajouté" : v === "Updated" ? "mis à jour" : "supprimé") + "."; }],
      [/^(Added|Updated|Deleted) check address "(.+)"\.$/, function (m, v, n) { return "Adresse pour les chèques « " + n + " » " + (v === "Added" ? "ajoutée" : v === "Updated" ? "mise à jour" : "supprimée") + "."; }],
      [/^Visa agreement sent to (.+)\.$/, "Entente Visa envoyée à $1."],
      [/^Visa agreement request created for (.+)\. Live email sending is not enabled for this environment\.$/, "Demande d'entente Visa créée pour $1. L'envoi réel de courriels n'est pas activé dans cet environnement."],
      [/^(.+) is not allowlisted, so no email was sent\.$/, "$1 ne figure pas sur la liste autorisée : aucun courriel n'a été envoyé."],
      [/^(.+) by (email|text message) turned (on|off)$/, function (m, t, c, o) { return (lookup(t) || t) + " par " + (c === "email" ? "courriel" : "message texte") + " " + (o === "on" ? "activées" : "désactivées"); }],
      [/^(.+) updated$/, function (m, l) { return (lookup(l) || l) + " mis à jour"; }],
      [DATE_RE, function (m) { return frDate(m); }]
    ]
  };

  /* The sidebar menu uses capitalised (title) case, like the English labels. */
  var NAV = {
    "fr-CA": {
      "Payments Received": "Paiements Reçus",
      "My Cards": "Mes Cartes",
      "Payment Preferences": "Préférences de Paiement",
      "My Profile": "Mon Profil",
      "Insights": "Analyses"
    }
  };

  var ATTRS = ["placeholder", "aria-label", "title", "alt", "data-sidebar-btn-tooltip"];
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, CODE: 1, PRE: 1 };

  var lang = "en";
  var textOrig = new WeakMap(); /* text node -> { orig, applied } */
  var attrOrig = new WeakMap(); /* element -> { attr: { orig, applied } } */
  var trackedTexts = []; /* weak-ish list so we can restore English */
  var trackedEls = [];
  var observer = null;
  var pending = false;
  var applying = false;
  var queue = [];

  function norm(s) {
    return s.replace(/’/g, "'").replace(/\s+/g, " ").trim();
  }

  function lookup(text, ctx) {
    var d = DICT[lang];
    if (!d) return null;
    var key = norm(text);
    if (!key) return null;
    if (ctx === "nav" && NAV[lang] && Object.prototype.hasOwnProperty.call(NAV[lang], key)) return NAV[lang][key];
    if (Object.prototype.hasOwnProperty.call(d, key)) return d[key];
    var rules = RULES[lang] || [];
    for (var i = 0; i < rules.length; i++) {
      if (rules[i][0].test(key)) return key.replace(rules[i][0], rules[i][1]);
    }
    return null;
  }

  function translateValue(raw, ctx) {
    var t = lookup(raw, ctx);
    if (t == null) return null;
    var lead = raw.match(/^\s*/)[0];
    var trail = raw.match(/\s*$/)[0];
    return lead + t + trail;
  }

  function ctxOf(el) {
    return el && el.closest && el.closest("[data-nav], .nav-item") ? "nav" : "";
  }

  function doText(node) {
    var rec = textOrig.get(node);
    var cur = node.nodeValue;
    if (rec && cur !== rec.applied) rec = null; /* the app rewrote it: treat as new source */
    if (!rec) {
      rec = { orig: cur, applied: cur };
      textOrig.set(node, rec);
      trackedTexts.push(new WeakRef(node));
    }
    var out = lang === "en" ? rec.orig : translateValue(rec.orig, ctxOf(node.parentNode));
    if (out == null) out = rec.orig;
    if (cur !== out) node.nodeValue = out;
    rec.applied = out;
  }

  function doAttrs(el) {
    var rec = attrOrig.get(el);
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i];
      if (!el.hasAttribute(a)) continue;
      var cur = el.getAttribute(a);
      var r = rec && rec[a];
      if (r && cur !== r.applied) r = null;
      if (!r) {
        if (!rec) { rec = {}; attrOrig.set(el, rec); trackedEls.push(new WeakRef(el)); }
        r = rec[a] = { orig: cur, applied: cur };
      }
      var out = lang === "en" ? r.orig : translateValue(r.orig, ctxOf(el));
      if (out == null) out = r.orig;
      if (cur !== out) el.setAttribute(a, out);
      r.applied = out;
    }
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) {
      if (!root.parentNode || !SKIP_TAGS[root.parentNode.nodeName]) doText(root);
      return;
    }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) {
      if (SKIP_TAGS[root.nodeName]) return;
      doAttrs(root);
    }
    var tw = document.createTreeWalker(root, 1 | 4, {
      acceptNode: function (n) {
        if (n.nodeType === 1 && SKIP_TAGS[n.nodeName]) return 2; /* reject subtree */
        return 1;
      }
    });
    var n;
    while ((n = tw.nextNode())) {
      if (n.nodeType === 3) doText(n);
      else doAttrs(n);
    }
  }

  function restoreAll() {
    trackedTexts = trackedTexts.filter(function (w) {
      var n = w.deref();
      if (!n) return false;
      doText(n);
      return true;
    });
    trackedEls = trackedEls.filter(function (w) {
      var e = w.deref();
      if (!e) return false;
      doAttrs(e);
      return true;
    });
  }

  function titleFix() {
    /* "<Page> - Consumer Portal": translate the page part, keep the brand. */
    var t = document.title;
    if (!titleFix.orig || (titleFix.applied !== t)) { titleFix.orig = t; }
    var parts = titleFix.orig.split(" - ");
    var out = titleFix.orig;
    if (lang !== "en" && parts.length === 2) {
      var tr = lookup(parts[0]);
      if (tr) out = tr + " - " + parts[1];
    }
    titleFix.applied = out;
    if (document.title !== out) document.title = out;
  }

  function flush() {
    pending = false;
    var items = queue;
    queue = [];
    applying = true;
    try {
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (it.isConnected !== false) walk(it);
      }
    } finally {
      applying = false;
      if (observer) observer.takeRecords();
    }
  }

  function schedule(node) {
    if (lang === "en") return; /* nothing to translate; switching language walks the whole page */
    queue.push(node);
    if (!pending) {
      pending = true;
      requestAnimationFrame(flush);
    }
  }

  function startObserver() {
    if (observer || typeof MutationObserver === "undefined") return;
    observer = new MutationObserver(function (records) {
      if (applying) return;
      for (var i = 0; i < records.length; i++) {
        var r = records[i];
        if (r.type === "childList") {
          for (var j = 0; j < r.addedNodes.length; j++) schedule(r.addedNodes[j]);
        } else if (r.type === "characterData") {
          schedule(r.target);
        } else if (r.type === "attributes") {
          schedule(r.target);
        }
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRS
    });
  }

  /* Language packs (e.g. consumer-i18n-es.js) register on window.ConsumerI18nPacks before this file loads. */
  function loadPacks() {
    var packs = window.ConsumerI18nPacks || {};
    Object.keys(packs).forEach(function (code) {
      var pack = packs[code];
      if (DICT[code]) return;
      DICT[code] = pack.dict;
      if (pack.nav) NAV[code] = pack.nav;
      if (pack.rules) RULES[code] = pack.rules({ lookup: lookup, norm: norm, DATE_RE: DATE_RE });
    });
  }

  function setLang(next) {
    loadPacks();
    lang = DICT[next] ? next : "en";
    applying = true;
    try {
      if (lang === "en") restoreAll();
      else { walk(document.body); restoreAll(); }
      titleFix();
    } finally {
      applying = false;
      if (observer) observer.takeRecords();
    }
    startObserver();
  }

  window.ConsumerI18n = { setLang: setLang, translate: function (r, c) { return translateValue(r, c); }, get lang() { return lang; } };

  document.addEventListener("consumer-language-change", function (e) {
    setLang(e.detail && e.detail.lang);
  });

  function init() {
    setLang(document.documentElement.lang);
    startObserver();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
