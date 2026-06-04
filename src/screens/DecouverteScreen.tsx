import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CATEGORIES } from '../data/mockData';

const EMOTIONS = ['😔 Tristesse', '😤 Colère', '😟 Anxiété', '🥰 Amour', '🎉 Joie', '😮 Surprise'];
const POPULAR_TAGS = ['#solitude', '#guérison', '#thérapie', '#famille', '#travail', '#identité'];

export default function DecouverteScreen() {
  const [query, setQuery] = useState('');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>🔍 Découverte</Text>

        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Échos, émotions, personnes…"
            placeholderTextColor="#aaa"
            value={query}
            onChangeText={setQuery}
          />
        </View>

        <Text style={styles.sectionTitle}>Thématiques</Text>
        <View style={styles.chipsRow}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity key={cat.id} style={styles.chip}>
              <Text style={styles.chipIcon}>{cat.icon}</Text>
              <Text style={styles.chipText}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Émotions</Text>
        <View style={styles.chipsRow}>
          {EMOTIONS.map(e => (
            <TouchableOpacity key={e} style={[styles.chip, styles.emotionChip]}>
              <Text style={styles.chipText}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Mots-clés populaires</Text>
        <View style={styles.chipsRow}>
          {POPULAR_TAGS.map(tag => (
            <TouchableOpacity key={tag} style={[styles.chip, styles.tagChip]}>
              <Text style={[styles.chipText, styles.tagText]}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Échos populaires</Text>
        <View style={styles.popularItem}>
          <Text style={styles.popularRank}>#1</Text>
          <View style={styles.popularContent}>
            <Text style={styles.popularText} numberOfLines={2}>
              "Après des mois de silence, j'ai enfin parlé à ma famille…"
            </Text>
            <Text style={styles.popularMeta}>🔊 63 EchoRep · ❤️ Courage</Text>
          </View>
        </View>
        <View style={styles.popularItem}>
          <Text style={styles.popularRank}>#2</Text>
          <View style={styles.popularContent}>
            <Text style={styles.popularText} numberOfLines={2}>
              "Je viens de terminer ma thérapie après 2 ans…"
            </Text>
            <Text style={styles.popularMeta}>🔊 47 EchoRep · 🌱 Gratitude</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F4FF' },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#1a1a2e', marginBottom: 16 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#333' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 10, marginTop: 4 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0EBFF', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  emotionChip: { backgroundColor: '#FFF0F8' },
  tagChip: { backgroundColor: '#E8F4FD' },
  chipIcon: { fontSize: 16 },
  chipText: { fontSize: 13, fontWeight: '500', color: '#555' },
  tagText: { color: '#2980B9' },
  popularItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  popularRank: { fontSize: 18, fontWeight: '700', color: '#7C5CBF', width: 30 },
  popularContent: { flex: 1 },
  popularText: { fontSize: 14, color: '#333', marginBottom: 4 },
  popularMeta: { fontSize: 12, color: '#888' },
});