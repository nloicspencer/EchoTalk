import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const STATS = [
  { label: 'Échos publiés', value: '24', icon: '🔊' },
  { label: 'Échos libres', value: '8', icon: '🕊️' },
  { label: 'Échos ouverts', value: '12', icon: '🌐' },
  { label: 'EchoRep reçus', value: '187', icon: '⭐' },
  { label: 'Réactions', value: '94', icon: '💙' },
  { label: 'Jares', value: '31', icon: '🏺' },
];

const HISTORY = [
  { date: 'Juin 2025', label: 'Collecte "Solitude urbaine"', count: 6 },
  { date: 'Avr. 2025', label: 'Collecte "Deuil & mémoire"', count: 4 },
  { date: 'Fév. 2025', label: 'Collecte "Première fois"', count: 9 },
];

export default function EchoProfilScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>V</Text>
          </View>
          <Text style={styles.name}>Valentina M.</Text>
          <Text style={styles.bio}>Je partage pour ne pas rester seule avec mes émotions.</Text>
          <TouchableOpacity style={styles.editBtn}>
            <Text style={styles.editBtnText}>Modifier le profil</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Mes statistiques</Text>
        <View style={styles.statsGrid}>
          {STATS.map(s => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Historique des collectes</Text>
        {HISTORY.map(h => (
          <View key={h.date} style={styles.historyItem}>
            <View style={styles.historyLeft}>
              <Text style={styles.historyDate}>{h.date}</Text>
              <Text style={styles.historyLabel}>{h.label}</Text>
            </View>
            <View style={styles.historyBadge}>
              <Text style={styles.historyCount}>{h.count} échos</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F4FF' },
  content: { padding: 16 },
  profileHeader: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#7C5CBF', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#fff' },
  name: { fontSize: 22, fontWeight: '700', color: '#1a1a2e', marginBottom: 6 },
  bio: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 14, lineHeight: 20 },
  editBtn: { borderWidth: 1, borderColor: '#7C5CBF', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 7 },
  editBtnText: { fontSize: 13, color: '#7C5CBF', fontWeight: '500' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard: { width: '30%', flexGrow: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  statIcon: { fontSize: 22, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '700', color: '#7C5CBF' },
  statLabel: { fontSize: 11, color: '#888', textAlign: 'center', marginTop: 2 },
  historyItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  historyLeft: { flex: 1 },
  historyDate: { fontSize: 12, color: '#999', marginBottom: 2 },
  historyLabel: { fontSize: 14, fontWeight: '500', color: '#333' },
  historyBadge: { backgroundColor: '#F0EBFF', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  historyCount: { fontSize: 12, color: '#7C5CBF', fontWeight: '600' },
});