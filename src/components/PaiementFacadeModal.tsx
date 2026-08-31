import './PaiementFacadeModal.css';

interface Props {
  titre: string;
  description: string;
  boutonTestLabel?: string;
  onFermer: () => void;
  onContinuerTest?: () => void;
}

// Fenêtre de paiement de FAÇADE (V3 — monétisation de l'Écho Solidaire,
// 21/08/2026). L'architecture (déclenchement, emplacement, texte) est
// prête pour le jour où un vrai prestataire de paiement (Stripe Connect
// envisagé — encaissement + reversement au bénéficiaire) sera intégré :
// il suffira alors de remplacer le contenu de cette modale par la vraie
// redirection/iframe fournie par le prestataire, sans toucher au reste
// du code (ProfilPage.tsx, useReactions.ts).
//
// `onContinuerTest` reste disponible pour que Loïc puisse continuer à
// tester le reste du parcours (crédit de jarres, etc.) sans bloquer sur
// un vrai paiement qui n'existe pas encore — à retirer une fois le
// prestataire réellement branché.
export default function PaiementFacadeModal({ titre, description, boutonTestLabel, onFermer, onContinuerTest }: Props) {
  return (
    <div className="paiement-facade-overlay" onClick={onFermer}>
      <div className="paiement-facade-modal" onClick={e => e.stopPropagation()}>
        <div className="paiement-facade-icone">🔒</div>
        <h3>{titre}</h3>
        <p>{description}</p>
        <p className="paiement-facade-note">
          Cette fenêtre sera fournie par notre prestataire de paiement (paiement sécurisé par carte ou virement). Elle n'est pas encore activée.
        </p>
        <div className="paiement-facade-actions">
          <button className="paiement-facade-fermer" onClick={onFermer}>Fermer</button>
          {onContinuerTest && (
            <button className="paiement-facade-test" onClick={onContinuerTest}>
              {boutonTestLabel || 'Continuer (mode test)'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
