import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { Notification, NotificationType } from '../types';
import './NotificationsPage.css';

const ICONES: Record<NotificationType, string> = {
  jarreBleue: '🫙',
  jarreRose: '🌸',
  coeur: '❤️',
  coeurBrise: '💔',
  echoRep: '🔓',
  echoRepValidee: '✅',
  echoRepRefusee: '🚫',
  echoBouteille: '🍾',
  moderation: '🛡️',
};

function libelle(n: Notification): string {
  const pseudo = n.expediteurPseudo || 'Quelqu\'un';
  switch (n.type) {
    case 'jarreBleue': return `${pseudo} vous a offert une jarre bleue.`;
    case 'jarreRose': return `${pseudo} vous a offert une jarre rose.`;
    case 'coeur': return `${pseudo} a aimé votre écho.`;
    case 'coeurBrise': return `${pseudo} a été touché·e par votre écho.`;
    case 'echoRep': return `${pseudo} souhaite répondre à votre Écho Ouvert — en attente de votre validation.`;
    case 'echoRepValidee': return 'Votre réponse à un Écho Ouvert a été validée.';
    case 'echoRepRefusee': return 'Votre réponse à un Écho Ouvert n\'a pas été retenue.';
    case 'echoBouteille': return 'Vous avez reçu un Écho-Bouteille.';
    case 'moderation': return n.contenuApercu || 'Une action de modération concerne un de vos échos.';
    default: return 'Nouvelle notification.';
  }
}

// Vers où chaque type de notification renvoie, une fois cliqué (30/09/2026,
// révisé le même jour) : d'abord vers la page publique /e/{id}, mais un
// service worker actif intercepte cette route et sert la coquille de l'app
// en cache — on reste donc DANS l'app, ce qui évite le problème et donne
// une navigation plus cohérente de toute façon.
// - Réactions et décisions sur une EchoRep déjà connue de son auteur·e ->
//   le Fil, en ciblant l'écho précis (voir FilPage.tsx, lecture de
//   ?echo={id} et défilement automatique).
// - EchoRep en attente de validation, et Écho-Bouteille reçue -> l'onglet
//   EchoProfil, seul endroit de l'app où ces deux actions se traitent
//   (ValidationEchoReps et EchoBouteille y sont tous les deux affichés).
// - Modération -> pas de lien : l'écho concerné peut avoir été masqué ou
//   supprimé, un lien y mènerait souvent vers une page vide.
type CibleLien = { type: 'interne'; to: string } | null;

function cibleLien(n: Notification): CibleLien {
  switch (n.type) {
    case 'jarreBleue':
    case 'jarreRose':
    case 'coeur':
    case 'coeurBrise':
    case 'echoRepValidee':
    case 'echoRepRefusee':
      return n.echoId ? { type: 'interne', to: `/?echo=${n.echoId}` } : null;
    case 'echoRep':
    case 'echoBouteille':
      return { type: 'interne', to: '/profil' };
    default:
      return null;
  }
}

export default function NotificationsPage() {
  const { profile } = useAuth();
  const { notifications, loading, erreur, nonLues, marquerCommeLue, marquerToutesCommeLues } = useNotifications(profile?.uid);

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <span className="notifications-badge" aria-hidden="true">🔔</span>
        <span className="notifications-kicker">EchoTalk</span>
        <h1>Notifications</h1>
        <p>Ce qui vous concerne, réuni au même endroit</p>
      </div>

      {nonLues > 0 && (
        <button className="notifications-tout-lire" onClick={marquerToutesCommeLues}>
          Tout marquer comme lu {nonLues > 0 && `(${nonLues})`}
        </button>
      )}

      {loading ? (
        <div className="notifications-vide">Chargement...</div>
      ) : erreur ? (
        <div className="notifications-vide">
          <span>⚠️</span>
          <p>Impossible de charger les notifications pour le moment. Réessaie dans un instant.</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="notifications-vide">
          <span>🔔</span>
          <p>Rien de nouveau pour l'instant.</p>
        </div>
      ) : (
        <div className="notifications-liste">
          {notifications.map((n) => {
            const cible = cibleLien(n);
            const contenuItem = (
              <>
                <span className="notification-icone" aria-hidden="true">{ICONES[n.type]}</span>
                <span className="notification-corps">
                  <span className="notification-texte">{libelle(n)}</span>
                  {n.type !== 'moderation' && n.contenuApercu && (
                    <span className="notification-apercu">« {n.contenuApercu} »</span>
                  )}
                  <span className="notification-date">
                    {n.createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </span>
                {!n.lu && <span className="notification-point" aria-hidden="true" />}
              </>
            );
            const className = `notification-item ${n.lu ? '' : 'non-lue'}`;
            const marquerLue = () => !n.lu && marquerCommeLue(n.id);

            if (cible) {
              return (
                <Link key={n.id} to={cible.to} className={className} onClick={marquerLue}>
                  {contenuItem}
                </Link>
              );
            }
            return (
              <button key={n.id} className={className} onClick={marquerLue}>
                {contenuItem}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
