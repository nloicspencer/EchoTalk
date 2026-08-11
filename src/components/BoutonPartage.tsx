import { useState, useRef, useEffect } from 'react';
import './BoutonPartage.css';

interface BoutonPartageProps {
  titre: string;
  texte: string;
  url: string;
  libelle?: string;
  className?: string;
}

// Composant de partage réutilisable (Levier n°3 "Inviter à résonner",
// et bientôt Levier n°1 "Échos partageables" sur EchoCard).
//
// Sur mobile, la Web Share API ouvre le menu natif du téléphone
// (WhatsApp, Messenger, SMS... selon ce qui est installé) — c'est le
// comportement à privilégier partout où il est disponible.
// Sur desktop, où cette API n'existe généralement pas, on affiche un
// petit menu de secours avec les canaux principaux.
export default function BoutonPartage({ titre, texte, url, libelle = 'Partager', className = '' }: BoutonPartageProps) {
  const [menuOuvert, setMenuOuvert] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOuvert) return;
    const fermerSiExterieur = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOuvert(false);
      }
    };
    document.addEventListener('mousedown', fermerSiExterieur);
    return () => document.removeEventListener('mousedown', fermerSiExterieur);
  }, [menuOuvert]);

  const handleClick = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: titre, text: texte, url });
      } catch {
        // L'utilisateur a annulé le partage natif — rien à faire.
      }
      return;
    }
    setMenuOuvert(v => !v);
  };

  const texteEtLien = `${texte} ${url}`;

  const copierLien = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setMenuOuvert(false);
    } catch {
      // Copie impossible (permissions navigateur) — le menu reste ouvert,
      // l'utilisateur peut sélectionner le lien manuellement.
    }
  };

  return (
    <div className={`bouton-partage-wrapper ${className}`} ref={menuRef}>
      <button className="bouton-partage" onClick={handleClick} type="button">
        <span aria-hidden="true">🔗</span> {libelle}
      </button>

      {menuOuvert && (
        <div className="bouton-partage-menu">
          <a
            className="bouton-partage-option"
            href={`https://wa.me/?text=${encodeURIComponent(texteEtLien)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenuOuvert(false)}
          >
            <span aria-hidden="true">💬</span> WhatsApp
          </a>
          <a
            className="bouton-partage-option"
            href={`mailto:?subject=${encodeURIComponent(titre)}&body=${encodeURIComponent(texteEtLien)}`}
            onClick={() => setMenuOuvert(false)}
          >
            <span aria-hidden="true">📧</span> Email
          </a>
          <a
            className="bouton-partage-option"
            href={`sms:?body=${encodeURIComponent(texteEtLien)}`}
            onClick={() => setMenuOuvert(false)}
          >
            <span aria-hidden="true">📱</span> SMS
          </a>
          <button className="bouton-partage-option" onClick={copierLien} type="button">
            <span aria-hidden="true">📋</span> Copier le lien
          </button>
        </div>
      )}
    </div>
  );
}
