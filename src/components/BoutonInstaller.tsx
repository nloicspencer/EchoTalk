import { useEffect, useState } from 'react';
import { estInstallee, estIPhone } from '../services/push';

// Bouton « Installer EchoTalk » (07/11/2026), affiché dans l'EchoProfil
// tant qu'EchoTalk n'est pas ouvert depuis son icône d'écran d'accueil.
// - Chrome / Android : ouvre la fenêtre d'installation du navigateur
//   (événement gardé de côté dans main.tsx).
// - iPhone : Apple interdit l'installation automatique, on affiche les
//   étapes à suivre dans Safari.
// - Autres navigateurs : indication générale.

interface EvenementInstallation extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type FenetreEchoTalk = Window & { __installEchoTalk?: EvenementInstallation };

export default function BoutonInstaller() {
  const [evenement, setEvenement] = useState<EvenementInstallation | null>(
    () => (window as FenetreEchoTalk).__installEchoTalk ?? null
  );
  const [installee, setInstallee] = useState(estInstallee());
  const [etapesVisibles, setEtapesVisibles] = useState(false);

  useEffect(() => {
    const disponible = () => setEvenement((window as FenetreEchoTalk).__installEchoTalk ?? null);
    const fini = () => { setInstallee(true); setEvenement(null); };
    window.addEventListener('echotalk-installable', disponible);
    window.addEventListener('appinstalled', fini);
    return () => {
      window.removeEventListener('echotalk-installable', disponible);
      window.removeEventListener('appinstalled', fini);
    };
  }, []);

  if (installee) return null;

  const iphone = estIPhone();

  const installer = async () => {
    if (evenement) {
      await evenement.prompt();
      const choix = await evenement.userChoice;
      if (choix.outcome === 'accepted') setInstallee(true);
      (window as FenetreEchoTalk).__installEchoTalk = undefined;
      setEvenement(null);
      return;
    }
    setEtapesVisibles(!etapesVisibles);
  };

  return (
    <div className="profil-section">
      <h3>Installer EchoTalk</h3>
      <p className="profil-note">
        Retrouvez EchoTalk en un geste, directement depuis l'écran d'accueil de votre téléphone, en plein écran.
        {iphone && " Sur iPhone, c'est aussi indispensable pour recevoir les notifications."}
      </p>
      <button className="btn-push" onClick={installer}>
        <i className="ti ti-download" aria-hidden="true" />
        {evenement ? 'Installer EchoTalk' : etapesVisibles ? 'Masquer les étapes' : 'Comment installer EchoTalk'}
      </button>
      {etapesVisibles && !evenement && (
        iphone ? (
          <ol className="installer-etapes">
            <li>Ouvrez <strong>echotalk.fr</strong> dans <strong>Safari</strong>.</li>
            <li>Touchez <strong>Partager</strong> (ou le menu <strong>⋯</strong>).</li>
            <li>Choisissez <strong>« Sur l'écran d'accueil »</strong>, puis <strong>Ajouter</strong>.</li>
            <li>Ouvrez EchoTalk depuis sa nouvelle icône et reconnectez-vous : l'icône a sa propre session, séparée de Safari.</li>
          </ol>
        ) : (
          <ol className="installer-etapes">
            <li>Ouvrez le <strong>menu</strong> de votre navigateur (<strong>⋮</strong> ou <strong>⋯</strong>).</li>
            <li>Choisissez <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>.</li>
            <li>Ouvrez EchoTalk depuis sa nouvelle icône.</li>
          </ol>
        )
      )}
    </div>
  );
}
