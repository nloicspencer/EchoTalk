import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SECTIONS = [
  {
    icon: '🌱',
    title: 'Notre vision',
    text: "EchoTalk est né d'une conviction simple : chaque émotion mérite d'être entendue. Nous croyons que le partage authentique, même dans l'anonymat, peut transformer une souffrance isolée en connexion humaine.",
  },
  {
    icon: '💙',
    title: 'Nos valeurs',
    text: "Bienveillance, authenticité, sécurité émotionnelle. Nous refusons la performance sociale. Ici, pas de likes compétitifs — seulement des EchoRep, des signes de résonance sincère.",
  },
  {
    icon: '🔊',
    title: 'Comment ça fonctionne',
    text: "Publiez un Écho — libre ou ouvert, anonyme ou identifié. La communauté résonne, réagit, collecte dans des Jares. Chaque interaction est pensée pour nourrir le lien, pas l'addiction.",
  },
  {
    icon: '📖',
    title: 'Notre histoire',
    text: "EchoTalk a été fondé en 2024 par une équipe convaincue que les réseaux sociaux peuvent être des espaces de soin. Après deux ans de recherche sur les impacts émotionnels du numérique, nous avons construit cet espace alternatif.",
  },
];

export default function DecouvrirEchoTalkScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>🌊</Text>
          <Text style={styles.heroTitle}>EchoTalk</Text>
          <Text style={styles.heroSub}>Le réseau social où chaque émotion trouve écho et soutien</Text>
        </View>

        {SECTIONS.map(section => (
          <View key={section.title} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>{section.icon}</Text>
              <Text style={styles.cardTitle}>{section.title}</Text>
            </View>
            <Text style={styles.cardText}>{section.text}</Text>
          </View>
        ))}

        <View style={styles.statsRow}>
          <View style={styles.statItem}><Text style={styles.statNum}>12k</Text><Text style={styles.statLabel}>Membres</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}><Text style={styles.statNum}>48k</Text><Text style={styles.statLabel}>Échos partagés</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}><Text style={styles.statNum}>200k</Text><Text style={styles.statLabel}>EchoRep donnés</Text></View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F4FF' },
  content: { padding: 16 },
  hero: { alignItems: 'center', paddingVertical: 24, marginBottom: 8 },
  heroEmoji: { fontSize: 52, marginBottom: 8 },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#7C5CBF', marginBottom: 6 },
  heroSub: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  cardIcon: { fontSize: 22 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  cardText: { fontSize: 14, color: '#555', lineHeight: 22 },
  statsRow: { flexDirection: 'row', backgroundColor: '#7C5CBF', borderRadius: 16, padding: 20, marginTop: 8, justifyContent: 'space-around', alignItems: 'center' },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.3)' },
});