import { SectionLegale } from '../constants/documentsLegaux';
import './DocumentLegalModal.css';

interface Props {
  titre: string;
  sections: SectionLegale[];
  onClose: () => void;
}

export default function DocumentLegalModal({ titre, sections, onClose }: Props) {
  return (
    <div className="document-legal-overlay" onClick={onClose}>
      <div className="document-legal-modal" onClick={e => e.stopPropagation()}>
        <div className="document-legal-header">
          <h3>{titre}</h3>
          <button className="document-legal-fermer" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <p className="document-legal-note">
          Version provisoire, en cours de relecture juridique avant l'ouverture publique.
        </p>
        <div className="document-legal-corps">
          {sections.map((s, i) => (
            <div key={i} className="document-legal-section">
              <h4>{s.titre}</h4>
              <p>{s.corps}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
