import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Echo } from '../types/Echo';
import { echosCollection } from '../config/firebase';
import firestore from '@react-native-firebase/firestore';

interface Props {
  echo: Echo;
}

function tempsRestant(expiresAt: Date): string {
  const diffMs = expiresAt.getTime() - Date.now();
  if (diffMs <= 0) return 'Expiré';
  const h = Math.floor(diffMs / 3600000);
  const m = Math.floor((diffMs % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

async function incrementReaction(echoId: string, key: 'resonance' | 'soutien' | 'jare') {
  await echosCollection.doc(echoId).update({
    [`reactions.${key}`]: firestore.FieldValue.increment(1),
  });
}

export default function EchoCard({ echo }: Props) {
  const {
    id,
    pseudonyme,
    contenu,
    tonalite,
    diffusion,
    interaction,
    participants,
    expiresAt,
    reactions,
    echorepCount,
  } = echo;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.pseudo}>{pseudonyme}</Text>
        <View style={styles.badges}>
          <Text style={styles.badge}>
            {tonalite === 'soleil' ? '☀️' : '🌧️'}
          </Text>
          <Text style={styles.badge}>
            {diffusion === 'libre' ? '🌊 Libre' : '🏡 Cercle'}
          </Text>
          <Text style={styles.badge}>
            {interaction === 'ouvert' ? '🤝 Ouvert' : '🔒 Fermé'}
          </Text>
        </View>
      </View>

      <Text style={styles.contenu}>{contenu}</Text>

      {diffusion === 'cercle' && (
        <View style={styles.cercleInfo}>
          <Text style={styles.cercleText}>
            👥 {participants.length} participant{participants.length > 1 ? 's' : ''}
          </Text>
          <Text style={styles.cercleText}>⏳ {tempsRestant(expiresAt)}</Text>
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.reactions}>
          <TouchableOpacity onPress={() => incrementReaction(id, 'resonance')}>
            <Text style={styles.reaction}>❤️ {reactions.resonance}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => incrementReaction(id, 'soutien')}>
            <Text style={styles.reaction}>💔 {reactions.soutien}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => incrementReaction(id, 'jare')}>
            <Text style={styles.reaction}>🫙 {reactions.jare}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.echoren}>🔁 {echorepCount}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  pseudo: {
    fontWeight: '700',
    fontSize: 15,
    color: '#1a1a2e',
  },
  badges: {
    flexDirection: 'row',
    gap: 4,
  },
  badge: {
    fontSize: 12,
    color: '#555',
    backgroundColor: '#f0f0f5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  contenu: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 10,
  },
  cercleInfo: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    backgroundColor: '#f5f0ff',
    padding: 8,
    borderRadius: 10,
  },
  cercleText: {
    fontSize: 13,
    color: '#7c5cbf',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  reactions: {
    flexDirection: 'row',
    gap: 16,
  },
  reaction: {
    fontSize: 16,
    color: '#444',
  },
  echoren: {
    fontSize: 13,
    color: '#888',
  },
});
