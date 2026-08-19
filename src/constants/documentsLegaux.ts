// Contenu affiché dans les modales CGU / Politique de confidentialité au
// moment de l'inscription, et étiquette de version associée, stockée
// comme preuve de consentement (voir AuthContext.tsx > inscription()).
//
// Version provisoire — textes en attente de relecture par un professionnel
// du droit avant l'ouverture publique. Comme aucun vrai utilisateur ne
// s'inscrit encore aujourd'hui (seule la page V0 de pré-inscription est
// publique), ça ne pose pas de risque de faire vivre ce mécanisme dès
// maintenant contre ces textes provisoires — seul le texte final devra
// être en place avant la vraie ouverture publique.
export const VERSION_DOCUMENTS_LEGAUX = '2026-08-12-provisoire';

export interface SectionLegale {
  titre: string;
  corps: string;
}

export const CGU_SECTIONS: SectionLegale[] = [
  { titre: '1. Objet', corps: "Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation du service EchoTalk, accessible à l'adresse echotalk.fr. Elles s'appliquent à tout utilisateur inscrit." },
  { titre: '2. Acceptation des conditions', corps: "L'inscription sur EchoTalk implique l'acceptation pleine et entière des présentes CGU, ainsi que de la Politique de confidentialité." },
  { titre: '3. Accès au service', corps: "Âge minimum : EchoTalk est réservé aux personnes de 18 ans et plus, vérifié à l'inscription à partir de la date de naissance renseignée. Identité et anonymat : l'inscription nécessite une identité réelle, jamais rendue publique — les autres utilisateurs ne voient qu'un pseudonyme généré automatiquement (association d'un oiseau et d'une commune française)." },
  { titre: '4. Description du service', corps: "EchoTalk permet de partager des expériences, émotions et réflexions via plusieurs formats : Écho Libre, Écho Ouvert, Écho-Bouteille, Écholègue, Écho Solidaire. L'ensemble de ces fonctionnalités n'est pas nécessairement disponible simultanément — le service évolue par versions successives." },
  { titre: '5. Compte utilisateur', corps: "Vous êtes responsable de la confidentialité de vos identifiants de connexion et de l'exactitude des informations fournies lors de l'inscription. Un seul compte par personne est autorisé." },
  { titre: '6. Règles de conduite', corps: "Il est interdit de publier du contenu relevant du harcèlement, des discours de haine ou de discrimination, de menaces réelles envers autrui, de contenu illégal, ou de spam. EchoTalk ne modère jamais la tristesse, la détresse personnelle, le doute ou le mal-être exprimés sur soi-même — ce contenu est au cœur de la vocation de la plateforme." },
  { titre: '7. Modération', corps: "EchoTalk s'appuie sur un système de modération combinant analyse automatisée et révision humaine. Selon la nature du contenu signalé : masquage réversible, suppression définitive, ou suspension/bannissement du compte. Un signal de détresse personnelle peut déclencher, à la discrétion d'un modérateur humain, la proposition de ressources d'aide — jamais une sanction." },
  { titre: '8. Contenu et propriété', corps: "Vous restez propriétaire du contenu que vous publiez. En le publiant, vous accordez à EchoTalk une licence non-exclusive nécessaire à son affichage et sa conservation. Après suppression de votre compte, le contenu déjà publié reste visible, associé à votre pseudonyme, sans lien avec votre identité réelle." },
  { titre: '9. Écho Solidaire — état actuel', corps: "À ce jour, aucune transaction financière n'a lieu sur EchoTalk : les Jarres Roses représentent un geste symbolique. Une évolution vers une contribution financière réelle est envisagée pour une version future ; des conditions complémentaires seront communiquées avant toute activation." },
  { titre: '10. Publicité', corps: "EchoTalk peut afficher des contenus publicitaires à compter d'une version future de la plateforme. La monétisation publicitaire ne doit jamais influencer la visibilité, le classement ou la modération des contenus publiés par les utilisateurs. Les emplacements publicitaires seront clairement identifiés comme tels et distincts des Échos publiés par la communauté." },
  { titre: '11. Suspension et résiliation', corps: "EchoTalk se réserve le droit de suspendre ou de résilier un compte en cas de manquement aux présentes CGU. L'utilisateur est informé de la raison de la sanction." },
  { titre: '12. Suppression de compte', corps: "Vous pouvez supprimer votre compte à tout moment depuis votre EchoProfil. Cette action est irréversible : votre identité réelle et votre accès au service sont définitivement supprimés." },
  { titre: '13. Responsabilité', corps: "EchoTalk s'efforce d'assurer un service fiable et sécurisé, sans garantie de disponibilité continue. Chaque utilisateur reste seul responsable du contenu qu'il publie." },
  { titre: '14. Modification des CGU', corps: "EchoTalk se réserve le droit de modifier les présentes CGU. Les utilisateurs seront informés de toute modification substantielle." },
  { titre: '15. Droit applicable', corps: "Les présentes CGU sont soumises au droit français." },
  { titre: '16. Contact', corps: "Pour toute question relative aux présentes CGU : contact@echotalk.fr" },
];

export const CONFIDENTIALITE_SECTIONS: SectionLegale[] = [
  { titre: '1. Introduction', corps: "EchoTalk attache une importance particulière à la protection des données personnelles de ses utilisateurs. Cette politique explique quelles données sont collectées, pourquoi, comment elles sont protégées, et quels sont vos droits." },
  { titre: '2. Responsable du traitement', corps: "Le responsable du traitement est l'exploitant d'EchoTalk, à titre individuel en attendant la structuration juridique de l'activité. Contact : contact@echotalk.fr" },
  { titre: '3. Données collectées', corps: "À l'inscription : prénom, nom, date de naissance, civilité, email, mot de passe (haché, jamais stocké en clair). Générées automatiquement : un pseudonyme (oiseau + commune), seul visible des autres utilisateurs. Contenu que vous publiez : Échos, EchoReps, Écholègues, Écho-Bouteilles, réactions." },
  { titre: '4. Finalités du traitement', corps: "Création et gestion de votre compte, vérification de l'âge minimum (18 ans), fonctionnement du service, modération et sécurité (analyse automatisée et humaine du contenu, y compris détection de signaux de détresse déclenchant uniquement une proposition de ressources d'aide), amélioration du service." },
  { titre: '5. Base légale', corps: "Exécution du contrat, intérêt légitime (modération et sécurité), et consentement recueilli explicitement à l'inscription — y compris, à terme, pour les cookies publicitaires." },
  { titre: '6. Destinataires et sous-traitants', corps: "Vos données ne sont jamais vendues. Google Ireland Limited (Firebase, hébergement base de données), Vercel Inc. (hébergement application), Anthropic PBC (analyse automatisée de modération via son IA Claude) y ont accès dans le cadre strict de leur mission. Une régie publicitaire tierce pourra s'ajouter à cette liste à l'avenir." },
  { titre: '7. Durée de conservation', corps: "Vos données d'identité sont conservées tant que votre compte est actif, et immédiatement supprimées en cas de suppression du compte. Le contenu publié reste visible sous votre pseudonyme, sans lien avec votre identité réelle." },
  { titre: '8. Vos droits', corps: "Conformément au RGPD : accès, rectification, effacement, opposition, limitation du traitement. Effacement possible directement depuis votre EchoProfil. Réclamation possible auprès de la CNIL." },
  { titre: '9. Sécurité', corps: "Votre identité réelle n'est jamais affichée publiquement. Votre mot de passe est géré par Firebase Authentication et jamais stocké en clair." },
  { titre: '10. Publicité et traceurs', corps: "À compter d'une version future, EchoTalk pourra afficher des contenus publicitaires via des régies tierces, avec dépôt de cookies soumis à votre consentement préalable, recueilli séparément de l'inscription." },
  { titre: '11. Cookies', corps: "À ce jour, seuls des cookies techniques nécessaires au fonctionnement du service sont utilisés (maintien de la session de connexion)." },
  { titre: '12. Mineurs', corps: "EchoTalk est réservé aux personnes de 18 ans et plus." },
  { titre: '13. Contact', corps: "Pour toute question : contact@echotalk.fr" },
];
