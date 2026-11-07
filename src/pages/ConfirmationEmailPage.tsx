import { useEffect, useState } from 'react';
import { applyActionCode } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { estInstallee, estIPhone } from '../services/push';
import './Auth.css';

// Page d'arrivée du lien de confirmation (07/11/2026) : echotalk.fr/verification
//
// Avant, le lien de l'e-mail menait à une page Firebase (hors EchoTalk),
// puis il fallait revenir soi-même dans l'appli. Désormais, le lien ouvre
// cette page, qui confirme l'adresse elle-même, puis :
// - si la personne est connectée dans ce navigateur : « Adresse confirmée »,
//   puis ouverture automatique de l'appli sur l'accueil (pseudo, règles) ;
// - sinon (cas typique de l'iPhone : le lien s'ouvre dans Safari alors que
//   le compte est dans l'icône EchoTalk) : « Adresse confirmée », avec
//   l'invitation à rouvrir EchoTalk. L'écran de vérification de l'icône
//   s'en aperçoit tout seul et passe à l'accueil.
type Etat = 'verification' | 'ok' | 'erreur';

export default function ConfirmationEmailPage() {
  const { user, loading, verifierEmail } = useAuth();
  const [etat, setEtat] = useState<Etat>('verification');
  const [lance, setLance] = useState(false);

  useEffect(() => {
    if (loading || lance) return;
    setLance(true);
    const code = new URLSearchParams(window.location.search).get('oobCode') ?? '';
    (async () => {
      try {
        if (!code) throw new Error('lien incomplet');
        await applyActionCode(auth, code);
        setEtat('ok');
      } catch {
        // Lien déjà utilisé (double clic, ou e-mail ouvert deux fois) : si
        // le compte connecté ici est bien confirmé, tout va bien.
        const dejaConfirme = user ? await verifierEmail(false).catch(() => false) : false;
        setEtat(dejaConfirme ? 'ok' : 'erreur');
      }
    })();
  }, [loading, lance, user, verifierEmail]);

  // Connecté dans ce navigateur : on entre dans l'appli après un instant.
  useEffect(() => {
    if (etat !== 'ok' || !user) return;
    const t = setTimeout(async () => {
      await verifierEmail(false).catch(() => false);
      window.location.replace('/');
    }, 1800);
    return () => clearTimeout(t);
  }, [etat, user, verifierEmail]);

  const iphoneSafari = estIPhone() && !estInstallee();

  return (
    <div className="auth-page">
      <div className={`auth-card verif-card ${etat === 'ok' ? 'verif-ok' : ''}`}>
        <div className="auth-logo">
          <span className={`verif-icone ${etat === 'ok' ? 'verif-icone-ok' : ''}`} aria-hidden="true">
            <i className={`ti ${etat === 'ok' ? 'ti-circle-check' : etat === 'erreur' ? 'ti-alert-circle' : 'ti-mail'}`} />
          </span>
          <h1>
            {etat === 'verification' ? 'Confirmation en cours…' : etat === 'ok' ? 'Adresse confirmée' : 'Lien expiré ou déjà utilisé'}
          </h1>
        </div>

        {etat === 'ok' && user && (
          <p className="verif-texte verif-centre">Merci ! Bienvenue sur EchoTalk, un instant…</p>
        )}

        {etat === 'ok' && !user && (
          <>
            <p className="verif-texte verif-centre">
              Merci, votre adresse e-mail est confirmée.
            </p>
            <p className="verif-texte verif-centre">
              {iphoneSafari
                ? "Vous pouvez fermer Safari et rouvrir EchoTalk depuis son icône sur votre écran d'accueil : vous y entrerez directement."
                : "Revenez dans EchoTalk, là où vous vous êtes inscrit·e : vous y entrerez directement."}
            </p>
            {!iphoneSafari && (
              <a className="auth-submit" href="/" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                Ouvrir EchoTalk
              </a>
            )}
          </>
        )}

        {etat === 'erreur' && (
          <>
            <p className="verif-texte verif-centre">
              Ce lien de confirmation n'est plus valable. Ouvrez EchoTalk, connectez-vous, puis touchez « Renvoyer l'e-mail » pour en recevoir un nouveau.
            </p>
            <a className="auth-submit" href="/" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
              Ouvrir EchoTalk
            </a>
          </>
        )}
      </div>
    </div>
  );
}
