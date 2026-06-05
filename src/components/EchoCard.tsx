import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Echo } from '../types/Echo';

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

async function reagir(echoId: string, cle: 'resonance' | 'soutien' | 'jare') {
  await updateDoc(doc(db, 'echos', echoId), {
    [`reactions.${cle}`]: increment(1),
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
            {tonalite === 'soleil' ? '☀️ Lumière' : '🌧️ Nuage'}
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
            👥 {participants.length} participant{participants.length !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.cercleText}>⏳ {tempsRestant(expiresAt)}</Text>
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.reactions}>
          <TouchableOpacity onPress={() => reagir(id, 'resonance')} activeOpacity={0.7}>
            <Text style={styles.reaction}>❤️ {reactions.resonance}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => reagir(id, 'soutien')} activeOpacity={0.7}>
            <Text style={styles.reaction}>💔 {reactions.soutien}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => reagir(id, 'jare')} activeOpacity={0.7}>
            <Text style={styles.reaction}>🫙 {reactions.jare}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.echorep}>🔁 {echorepCount}</Text>
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
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 6,
  },
  pseudo: {
    fontWeight: '700',
    fontSize: 15,
    color: '#1a1a2e',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  badge: {
    fontSize: 11,
    color: '#555',
    backgroundColor: '#f0f0f5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  contenu: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 12,
  },
  cercleInfo: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    backgroundColor: '#f5f0ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  cercleText: {
    fontSize: 13,
    color: '#7c5cbf',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reactions: {
    flexDirection: 'row',
    gap: 16,
  },
  reaction: {
    fontSize: 16,
    color: '#444',
  },
  echorep: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
});
