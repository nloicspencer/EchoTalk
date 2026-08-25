import './EncartPublicitaireHeader.css';

// Emplacement publicitaire (V4 — Publicité), désormais en bandeau pleine
// largeur, juste sous l'en-tête EchoTalk/pseudo. Régie non encore choisie :
// ce composant affiche pour l'instant un espace réservé, clairement
// étiqueté "Publicité" (engagement pris dans les CGU — la monétisation ne
// doit jamais se confondre avec le contenu de la communauté). Le jour où
// une régie sera intégrée, il suffira de remplacer le contenu interne de
// ce composant — son emplacement dans FilPage.tsx restera inchangé.
export default function EncartPublicitaireHeader() {
  return (
    <div className="pub-banner-full">
      <span className="pub-banner-label">Publicité</span>
      <div className="pub-banner-texte">Emplacement disponible</div>
    </div>
  );
}
