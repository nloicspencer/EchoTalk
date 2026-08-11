import { useEffect, useState } from 'react';
import { doc, getDoc, collection, getDocs, query, orderBy, DocumentData } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Echo, EchoRep } from '../types';
import JarreIcon from '../components/JarreIcon';
import '../components/EchoCard.css';
import './EchoPublicPage.css';

interface Props { echoId: string; }

function convertirEcho(id: string, data: DocumentData): Echo {
  return {
    id,
    ...data,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
    expiresAt: data.expiresAt?.toDate ? data.expiresAt.toDate() : undefined,
  } as Echo;
}

function convertirRep(id: string, data: DocumentData): EchoRep & { supprime?: boolean } {
  return {
    id,
    ...data,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
  } as EchoRep & { supprime?: boolean };
}

// Page publique d'un seul Écho, consultable sans compte via un lien
// partagé (Levier n°1 — Échos partageables). Ne fait aucune écriture,
// aucune écoute temps réel — une simple lecture au chargement, puisque
// le visiteur n'a de toute façon pas de compte pour interagir.
export default function EchoPublicPage({ echoId }: Props) {
  const [echo, setEcho] = useState<Echo | null>(null);
  const [echoReps, setEchoReps] = useState<Array<EchoRep & { supprime?: boolean }>>([]);
  const [statut, setStatut] = useState<'chargement' | 'ok' | 'indisponible'>('chargement');

  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'echos', echoId));
        if (!snap.exists()) { if (!annule) setStatut('indisponible'); return; }
        const data = snap.data();

        // Un Écho masqué (en cours de modération) ou supprimé ne doit
        // jamais afficher son contenu à un visiteur public, même via un
        // lien déjà partagé avant l'action de modération.
        if (data.masque || data.supprime) { if (!annule) setStatut('indisponible'); return; }

        const e = convertirEcho(snap.id, data);
        if (!annule) setEcho(e);

        if (e.type === 'ouvert') {
          const repsSnap = await getDocs(
            query(collection(db, 'echos', echoId, 'echoreps'), orderBy('createdAt', 'asc'))
          );
          const reps = repsSnap.docs
            .map(d => convertirRep(d.id, d.data()))
            .filter(r => !r.supprime);
          if (!annule) setEchoReps(reps);
        }
        if (!annule) setStatut('ok');
      } catch {
        if (!annule) setStatut('indisponible');
      }
    })();
    return () => { annule = true; };
  }, [echoId]);

  if (statut === 'chargement') {
    return (
      <div className="echo-public-page">
        <div className="echo-public-chargement">
          <span>🫙</span>
          <p>EchoTalk</p>
        </div>
      </div>
    );
  }

  if (statut === 'indisponible' || !echo) {
    return (
      <div className="echo-public-page">
        <div className="echo-public-indisponible">
          <h2>Cet Écho n'est plus disponible.</h2>
          <a href="https://echotalk.fr" className="echo-public-cta-btn">Découvrir EchoTalk</a>
        </div>
      </div>
    );
  }

  const tonaliteClass = echo.tonalite === 'soleil' ? 'tonalite-soleil' : 'tonalite-pluie';

  return (
    <div className="echo-public-page">
      <div className="echo-public-header">
        <span className="echo-public-logo">EchoTalk</span>
      </div>

      <div className={`echo-card ${tonaliteClass} ${echo.estSolidaire ? 'solidaire' : ''}`}>
        <div className="echo-card-top">
          <div className="echo-card-meta">
            <span className="echo-card-pseudo">{echo.auteurPseudo}</span>
            {echo.type === 'ouvert' && (
              <div className="echo-card-ouvert-info">
                <span>
                  <i className="ti ti-users" aria-hidden="true" style={{ fontSize: '12px' }} />
                  {' '}{echo.placesOccupees ?? 0}/{echo.placesMax}
                </span>
              </div>
            )}
          </div>
          <div className="echo-card-badges">
            <span className="et-badge et-badge-neutral">{echo.tonalite === 'soleil' ? '☀️' : '🌧️'}</span>
            <span className="et-badge et-badge-neutral">{echo.type === 'libre' ? '🕊️ Libre' : '🔓 Ouvert'}</span>
            {echo.estSolidaire && (
              <span className="et-badge et-badge-rose"><JarreIcon color="rose" size="s" /> Solidaire</span>
            )}
          </div>
        </div>

        <p className="echo-card-text">{echo.contenu}</p>

        <div className="echo-card-reactions">
          {echo.estSolidaire ? (
            <span className="echo-reaction-btn active-rose">
              <JarreIcon color="rose" size="s" /> {echo.jarresRoses || 0}
            </span>
          ) : (
            <>
              <span className="echo-reaction-btn"><JarreIcon color="blue" size="s" /> {echo.jarresBleues || 0}</span>
              <span className="echo-reaction-btn">❤️ {echo.coeurs || 0}</span>
              <span className="echo-reaction-btn">💔 {echo.coeursBrises || 0}</span>
            </>
          )}
        </div>

        {echo.type === 'ouvert' && echoReps.length > 0 && (
          <div className="echoreps">
            <div className="echoreps-liste">
              {echoReps.map(rep => (
                <div key={rep.id} className="echorep-item">
                  <span className="echorep-pseudo">{rep.auteurPseudo}</span>
                  <p className="echorep-contenu">{rep.contenu}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="echo-card-footer">
          <span />
          <span className="echo-card-date">
            {echo.createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      <div className="echo-public-cta">
        <p>Pour réagir, répondre ou découvrir d'autres Échos, rejoignez EchoTalk.</p>
        <a href="https://echotalk.fr" className="echo-public-cta-btn">Créer un compte</a>
      </div>
    </div>
  );
}
