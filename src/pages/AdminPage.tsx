import { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';

import './AdminPage.css';

// Email(s) admin autorisés
const ADMINS = ['loicspencer3@echotalk.com'];

interface EchoCandidат {
  id: string;
  auteurPseudo: string;
  contenu: string;
  jarresBleues: number;
  jarresRoses: number;
  coeurs: number;
  createdAt: Date;
  estSolidaire: boolean;
  type: string;
}

export default function AdminPage() {
  const { user } = useAuth();
  const [candidats, setCandidats] = useState<EchoCandidат[]>([]);
  const [echoSolidaireActuel, setEchoSolidaireActuel] = useState<EchoCandidат | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user && ADMINS.includes(user.email ?? '')) {
      chargerDonnees();
    }
  }, [user]);

  // Vérifier si admin
  if (!user || !ADMINS.includes(user.email ?? '')) {
    return (
      <div className="admin-page">
        <div className="admin-header">
          <h1>⚠️ Accès refusé</h1>
          <p>Cette page est réservée à l'équipe EchoTalk.</p>
        </div>
      </div>
    );
  }

  const chargerDonnees = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, 'echos'));

    // Début du mois en cours
    const debutMois = new Date();
    debutMois.setDate(1);
    debutMois.setHours(0, 0, 0, 0);

    const echos: EchoCandidат[] = [];
    let solidaireActuel: EchoCandidат | null = null;

    snap.docs.forEach(d => {
      const data = d.data();
      if (data.supprime) return;

      const createdAt = data.createdAt instanceof Timestamp
        ? data.createdAt.toDate()
        : new Date();

      const echo: EchoCandidат = {
        id: d.id,
        auteurPseudo: data.auteurPseudo,
        contenu: data.contenu,
        jarresBleues: data.jarresBleues || 0,
        jarresRoses: data.jarresRoses || 0,
        coeurs: data.coeurs || 0,
        createdAt,
        estSolidaire: data.estSolidaire || false,
        type: data.type,
      };

      if (echo.estSolidaire) {
        solidaireActuel = echo;
      }

      // Candidats du mois — échos avec jarres, pas déjà solidaire
      if (!echo.estSolidaire && echo.jarresBleues > 0 && createdAt >= debutMois) {
        echos.push(echo);
      }
    });

    // Trier par jarres bleues décroissant
    echos.sort((a, b) => b.jarresBleues - a.jarresBleues);

    setCandidats(echos.slice(0, 10)); // Top 10
    setEchoSolidaireActuel(solidaireActuel);
    setLoading(false);
  };

  const validerEchoSolidaire = async (echoId: string) => {
    try {
      // Retirer l'ancien écho solidaire
      if (echoSolidaireActuel) {
        await updateDoc(doc(db, 'echos', echoSolidaireActuel.id), { estSolidaire: false });
      }
      // Définir le nouveau
      await updateDoc(doc(db, 'echos', echoId), { estSolidaire: true });
      setMessage('✅ Écho Solidaire mis à jour avec succès.');
      chargerDonnees();
    } catch {
      setMessage('❌ Erreur lors de la mise à jour.');
    }
    setTimeout(() => setMessage(''), 4000);
  };

  const retirerEchoSolidaire = async () => {
    if (!echoSolidaireActuel) return;
    await updateDoc(doc(db, 'echos', echoSolidaireActuel.id), { estSolidaire: false });
    setMessage('✅ Écho Solidaire retiré.');
    chargerDonnees();
    setTimeout(() => setMessage(''), 4000);
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>⚙️ Administration EchoTalk</h1>
        <p>Accès restreint — équipe EchoTalk</p>
      </div>

      {message && <div className="admin-message">{message}</div>}

      {/* Écho Solidaire actuel */}
      <div className="admin-section">
        <h2>💛 Écho Solidaire actuel</h2>
        {echoSolidaireActuel ? (
          <div className="admin-echo-card solidaire-actuel">
            <span className="admin-pseudo">{echoSolidaireActuel.auteurPseudo}</span>
            <p className="admin-contenu">{echoSolidaireActuel.contenu}</p>
            <div className="admin-stats">
              <span>🫙 {echoSolidaireActuel.jarresBleues}</span>
              <span>🌸 {echoSolidaireActuel.jarresRoses}</span>
              <span>❤️ {echoSolidaireActuel.coeurs}</span>
            </div>
            <button className="btn-retirer" onClick={retirerEchoSolidaire}>
              Retirer cet Écho Solidaire
            </button>
          </div>
        ) : (
          <p className="admin-vide">Aucun Écho Solidaire défini ce mois-ci.</p>
        )}
      </div>

      {/* Candidats du mois */}
      <div className="admin-section">
        <h2>🏆 Candidats du mois</h2>
        <p className="admin-note">Échos publiés ce mois-ci, classés par jarres bleues reçues.</p>
        {loading ? (
          <p>Chargement...</p>
        ) : candidats.length === 0 ? (
          <p className="admin-vide">Aucun candidat ce mois-ci.</p>
        ) : (
          <div className="admin-liste">
            {candidats.map((echo, i) => (
              <div key={echo.id} className="admin-echo-card">
                <div className="admin-rang">#{i + 1}</div>
                <div className="admin-echo-content">
                  <span className="admin-pseudo">{echo.auteurPseudo}</span>
                  <p className="admin-contenu">{(echo.contenu || '').slice(0, 100)}{(echo.contenu || '').length > 100 ? '...' : ''}</p>
                  <div className="admin-stats">
                    <span>🫙 {echo.jarresBleues} jarres</span>
                    <span>❤️ {echo.coeurs}</span>
                    <span>{echo.createdAt.toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
                <button
                  className="btn-valider"
                  onClick={() => validerEchoSolidaire(echo.id)}
                >
                  Définir comme Écho Solidaire
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
