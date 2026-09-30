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
    case 'moderation': return n.contenuApercu || 'Une action de modération concerne un de vos échos.';
    default: return 'Nouvelle notification.';
  }
}

export default function NotificationsPage() {
  const { profile } = useAuth();
  const { notifications, loading, nonLues, marquerCommeLue, marquerToutesCommeLues } = useNotifications(profile?.uid);

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
      ) : notifications.length === 0 ? (
        <div className="notifications-vide">
          <span>🔔</span>
          <p>Rien de nouveau pour l'instant.</p>
        </div>
      ) : (
        <div className="notifications-liste">
          {notifications.map((n) => (
            <button
              key={n.id}
              className={`notification-item ${n.lu ? '' : 'non-lue'}`}
              onClick={() => !n.lu && marquerCommeLue(n.id)}
            >
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
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
