import './EncartPublicitaireHeader.css';

// Emplacement publicitaire (V4 — Publicité), dans l'en-tête du Fil, à
// droite du logo. Régie non encore choisie : ce composant affiche pour
// l'instant un espace réservé, clairement étiqueté "Publicité" (engagement
// pris dans les CGU — la monétisation ne doit jamais se confondre avec le
// contenu de la communauté). Le jour où une régie sera intégrée, il
// suffira de remplacer le contenu interne de ce composant — l'emplacement
// dans FilPage.tsx restera inchangé.
export default function EncartPublicitaireHeader() {
  return (
    <div className="pub-header-slot">
      <span className="pub-header-label">Publicité</span>
      <span className="pub-header-texte">Emplacement disponible</span>
    </div>
  );
}
