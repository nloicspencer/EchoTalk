import { useAuth } from './hooks/useAuth';
import './SuspensionBanner.css';

export default function SuspensionBanner() {
  const { messageDeconnexion, effacerMessageDeconnexion, suspension } = useAuth();

  if (!messageDeconnexion) return null;

  const isBan = suspension.banni || messageDeconnexion.includes('banni');

  return (
    <div className={`suspension-banner ${isBan ? 'ban' : 'suspension'}`}>
      <div className="suspension-banner-content">
        <i className={`ti ${isBan ? 'ti-ban' : 'ti-clock'}`} aria-hidden="true" />
        <p>{messageDeconnexion}</p>
      </div>
      <button className="suspension-banner-close" onClick={effacerMessageDeconnexion}>
        <i className="ti ti-x" aria-hidden="true" />
      </button>
    </div>
  );
}
