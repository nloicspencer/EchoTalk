import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

// Vérification de l'adresse e-mail (31/10/2026) — écran bloquant affiché
// par App.tsx tant que l'adresse n'est pas confirmée : aucune autre page
// n'est accessible, et les règles Firestore refusent de toute façon tout
// accès aux données d'un compte non vérifié.
//
// Délai de 3 jours : seuls les comptes créés à partir de
// DEBUT_SUPPRESSION_NON_VERIFIES sont concernés (même date que dans la
// Cloud Function supprimerComptesNonVerifies). Les comptes plus anciens
// (pionniers) doivent vérifier leur adresse, mais ne sont jamais supprimés.
const DEBUT_SUPPRESSION_NON_VERIFIES = Date.parse('2026-10-31T12:00:00Z');
const DELAI_MS = 3 * 24 * 60 * 60 * 1000;
const ATTENTE_RENVOI_S = 60;

export default function VerificationEmailPage() {
  const { user, verifierEmail, validerEmail, renvoyerEmailVerification, deconnexion } = useAuth();
  const [message, setMessage] = useState('');
  const [verification, setVerification] = useState(false);
  const [attenteRenvoi, setAttenteRenvoi] = useState(0);
  // Adresse confirmée (07/11/2026) : on l'annonce clairement pendant un
  // court instant, puis l'appli s'ouvre sur l'accueil (pseudo, règles).
  const [confirme, setConfirme] = useState(false);

  // Vérification automatique : à l'affichage, au retour sur l'onglet ou
  // dans l'appli, et toutes les 4 secondes tant que l'écran est visible.
  // Ainsi, après un clic sur le lien (dans un autre onglet, ou dans Safari
  // sur iPhone), cet écran passe tout seul à « Adresse confirmée ».
  useEffect(() => {
    if (confirme) return;
    let annule = false;
    let enCours = false;
    const controler = async () => {
      if (annule || enCours || document.visibilityState !== 'visible') return;
      enCours = true;
      try {
        if (await verifierEmail(false)) {
          if (annule) return;
          setConfirme(true);
          setTimeout(() => validerEmail(), 1800);
        }
      } catch { /* réseau : on réessaiera */ } finally {
        enCours = false;
      }
    };
    controler();
    const minuteur = setInterval(controler, 4000);
    document.addEventListener('visibilitychange', controler);
    window.addEventListener('focus', controler);
    return () => {
      annule = true;
      clearInterval(minuteur);
      document.removeEventListener('visibilitychange', controler);
      window.removeEventListener('focus', controler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirme]);

  useEffect(() => {
    if (attenteRenvoi <= 0) return;
    const t = setTimeout(() => setAttenteRenvoi(attenteRenvoi - 1), 1000);
    return () => clearTimeout(t);
  }, [attenteRenvoi]);

  const creation = user?.metadata.creationTime ? Date.parse(user.metadata.creationTime) : NaN;
  const avecDelai = !Number.isNaN(creation) && creation >= DEBUT_SUPPRESSION_NON_VERIFIES;
  const echeance = avecDelai ? new Date(creation + DELAI_MS) : null;
  // Un compte créé après la mise en place a reçu l'e-mail à l'inscription.
  // Un compte plus ancien (pionnier) n'a encore rien reçu : il le demande.
  const [envoye, setEnvoye] = useState(avecDelai);

  const handleVerifier = async () => {
    setVerification(true);
    setMessage('');
    try {
      const ok = await verifierEmail(false);
      if (ok) {
        setConfirme(true);
        setTimeout(() => validerEmail(), 1800);
      } else {
        setMessage("Votre adresse n'est pas encore confirmée. Cliquez sur le lien reçu par e-mail, puis réessayez.");
      }
    } catch {
      setMessage('Une erreur est survenue. Réessayez dans un instant.');
    } finally {
      setVerification(false);
    }
  };

  const handleRenvoyer = async () => {
    setMessage('');
    try {
      await renvoyerEmailVerification();
      setMessage(envoye ? 'Un nouvel e-mail vient de vous être envoyé.' : 'L\'e-mail de confirmation vient de vous être envoyé.');
      setEnvoye(true);
      setAttenteRenvoi(ATTENTE_RENVOI_S);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      setMessage(code.includes('too-many-requests')
        ? 'Trop de demandes. Réessayez dans quelques minutes.'
        : 'Une erreur est survenue. Réessayez dans un instant.');
    }
  };

  if (confirme) {
    return (
      <div className="auth-page">
        <div className="auth-card verif-card verif-ok">
          <div className="auth-logo">
            <span className="verif-icone verif-icone-ok" aria-hidden="true"><i className="ti ti-circle-check" /></span>
            <h1>Adresse confirmée</h1>
          </div>
          <p className="verif-texte verif-centre">Merci ! Bienvenue sur EchoTalk, un instant…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card verif-card">
        <div className="auth-logo">
          <span className="verif-icone" aria-hidden="true"><i className="ti ti-mail" /></span>
          <h1>{envoye ? 'Vérifiez votre boîte mail' : 'Confirmez votre adresse e-mail'}</h1>
        </div>

        {envoye ? (
          <p className="verif-texte">
            Un e-mail de confirmation a été envoyé à <strong>{user?.email}</strong>.
            Cliquez sur le lien qu'il contient pour accéder à EchoTalk.
          </p>
        ) : (
          <p className="verif-texte">
            Pour continuer à utiliser EchoTalk, confirmez votre adresse <strong>{user?.email}</strong> :
            nous allons vous envoyer un e-mail contenant un lien de confirmation.
          </p>
        )}

        {echeance && (
          <p className="verif-texte verif-delai">
            Ce lien est valable 3 jours, jusqu'au{' '}
            {echeance.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}.
            Passé ce délai, le compte et le pseudonyme qui vous a été attribué seront supprimés.
          </p>
        )}

        <p className="verif-texte verif-astuce">
          Pensez à regarder dans vos courriers indésirables. Sur iPhone, le lien s'ouvre dans Safari :
          une fois l'adresse confirmée, revenez simplement ici.
        </p>

        {message && <p className="verif-message">{message}</p>}

        <div className="verif-actions">
          {envoye ? (
            <>
              <button type="button" className="auth-submit" onClick={handleVerifier} disabled={verification}>
                {verification ? '...' : "J'ai confirmé mon adresse"}
              </button>
              <button type="button" className="verif-secondaire" onClick={handleRenvoyer} disabled={attenteRenvoi > 0}>
                {attenteRenvoi > 0 ? `Renvoyer l'e-mail (${attenteRenvoi} s)` : "Renvoyer l'e-mail"}
              </button>
            </>
          ) : (
            <button type="button" className="auth-submit" onClick={handleRenvoyer}>
              M'envoyer l'e-mail de confirmation
            </button>
          )}
          <button type="button" className="auth-mdp-oublie verif-deconnexion" onClick={() => deconnexion()}>
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
