import { useEffect, useState } from 'react';
import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import '../services/firebase';
import './Auth.css';

// Désinscription du résumé des notifications par e-mail (31/10/2026).
// Ouverte depuis le lien « Ne plus recevoir ce résumé » de chaque e-mail,
// sans avoir besoin d'être connecté : la signature du lien (paramètre s),
// vérifiée par la Cloud Function desinscrireResume, prouve qu'il vient
// bien d'un e-mail envoyé par EchoTalk.
export default function DesinscriptionPage() {
  const [etat, setEtat] = useState<'attente' | 'ok' | 'erreur'>('attente');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const u = params.get('u') ?? '';
    const s = params.get('s') ?? '';
    if (!u || !s) { setEtat('erreur'); return; }
    httpsCallable(getFunctions(getApp(), 'europe-west9'), 'desinscrireResume')({ u, s })
      .then(() => setEtat('ok'))
      .catch(() => setEtat('erreur'));
  }, []);

  return (
    <div className="auth-page">
      <div className="auth-card verif-card">
        <div className="auth-logo">
          <span className="verif-icone" aria-hidden="true"><i className="ti ti-mail-off" /></span>
          <h1>
            {etat === 'attente' ? 'Un instant…' : etat === 'ok' ? 'C\'est fait' : 'Lien invalide'}
          </h1>
        </div>
        {etat === 'ok' && (
          <p className="verif-texte">
            Vous ne recevrez plus le résumé de vos notifications par e-mail. Vous pouvez le réactiver
            à tout moment depuis votre EchoProfil.
          </p>
        )}
        {etat === 'erreur' && (
          <p className="verif-texte">
            Ce lien de désinscription n'est pas valide. Vous pouvez désactiver le résumé par e-mail
            depuis votre EchoProfil, ou nous écrire à contact@echotalk.fr.
          </p>
        )}
        {etat !== 'attente' && (
          <a className="auth-submit" href="/" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
            Ouvrir EchoTalk
          </a>
        )}
      </div>
    </div>
  );
}
