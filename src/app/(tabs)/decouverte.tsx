import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CATEGORIES = [
  { id: '1', label: 'Anxiete', icon: '🌀', color: '#FFD180' },
  { id: '2', label: 'Deuil', icon: '🕯', color: '#B0BEC5' },
  { id: '3', label: 'Joie', icon: '✨', color: '#FFF176' },
  { id: '4', label: 'Colere', icon: '🔥', color: '#FF8A80' },
  { id: '5', label: 'Solitude', icon: '🌙', color: '#CE93D8' },
  { id: '6', label: 'Espoir', icon: '🌱', color: '#A5D6A7' },
];

const EMOTIONS = [
  { id: 'sad', label: 'Triste', emoji: '😔', color: '#90CAF9' },
  { id: 'angry', label: 'En colere', emoji: '😤', color: '#FF8A80' },
  { id: 'anxious', label: 'Anxieux', emoji: '😯', color: '#FFD180' },
  { id: 'loving', label: 'Amour', emoji: '🥰', color: '#F48FB1' },
  { id: 'happy', label: 'Joyeux', emoji: '🎉', color: '#FFF176' },
  { id: 'hopeful', label: 'Plein espoir', emoji: '🌱', color: '#A5D6A7' },
];

const TAGS = ['#solitude', '#guerison', '#therapie', '#famille', '#travail', '#identite', '#deuil', '#anxiete'];

const ECHOS = [
  { id: '1', author: 'Marie L.', avatar: 'M', content: 'Petite victoire du jour. Je suis sortie du lit malgre tout.', emotion: 'hopeful', emoji: '🌱', tags: ['#petitesvictoires'], time: '2h', likes: 24, comments: 8 },
  { id: '2', author: 'Thomas R.', avatar: 'T', content: "L'anxiete ce matin etait forte mais j'ai respire et ca a aide.", emotion: 'anxious', emoji: '😯', tags: ['#anxiete', '#respiration'], time: '4h', likes: 31, comments: 12 },
  { id: '3', author: 'Sofia M.', avatar: 'S', content: 'Parfois je me demande si je vais trouver ma place.', emotion: 'sad', emoji: '😔', tags: ['#solitude', '#identite'], time: '6h', likes: 47, comments: 19 },
];

export default function ZDecouverteScreen() {
  const [query, setQuery] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const filtered = ECHOS.filter(e => {
    const matchQuery = query === '' || e.content.toLowerCase().includes(query.toLowerCase());
    const matchEmotion = !selectedEmotion || e.emotion === selectedEmotion;
    const matchTags = selectedTags.length === 0 || selectedTags.some(t => e.tags.includes(t));
    return matchQuery && matchEmotion && matchTags;
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>🔍 Decouverte</Text>

        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Echos, emotions, personnes..."
            placeholderTextColor="#aaa"
            value={query}
            onChangeText={setQuery}
          />
          {query !== '' && (
            <TouchableOpacity onPress={() => setQuery('')}><Text style={styles.clearBtn}>x</Text></TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionTitle}>Categories</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity key={cat.id} style={[styles.categoryChip, { backgroundColor: cat.color }]}>
              <Text style={styles.chipIcon}>{cat.icon}</Text>
              <Text style={styles.chipLabel}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Filtrer par emotion</Text>
        <View style={styles.emotionGrid}>
          {EMOTIONS.map(e => (
            <TouchableOpacity
              key={e.id}
              style={[styles.emotionCard, { backgroundColor: e.color }, selectedEmotion === e.id && styles.emotionSelected]}
              onPress={() => setSelectedEmotion(selectedEmotion === e.id ? null : e.id)}
            >
              <Text style={styles.emotionEmoji}>{e.emoji}</Text>
              <Text style={styles.emotionLabel}>{e.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Tags populaires</Text>
        <View style={styles.tagRow}>
          {TAGS.map(tag => (
            <TouchableOpacity
              key={tag}
              style={[styles.tagChip, selectedTags.includes(tag) && styles.tagSelected]}
              onPress={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
            >
              <Text style={[styles.tagText, selectedTags.includes(tag) && styles.tagTextSelected]}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Echos populaires</Text>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Aucun echo ne correspond</Text>
            <TouchableOpacity onPress={() => { setQuery(''); setSelectedEmotion(null); setSelectedTags([]); }}>
              <Text style={styles.resetBtn}>Reinitialiser</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filtered.map(echo => (
            <View key={echo.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{echo.avatar}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.authorName}>{echo.author}</Text>
                  <Text style={styles.timeText}>{echo.time}</Text>
                </View>
                <Text style={styles.cardEmoji}>{echo.emoji}</Text>
              </View>
              <Text style={styles.cardContent}>{echo.content}</Text>
              <View style={styles.cardTags}>
                {echo.tags.map(t => <Text key={t} style={styles.cardTag}>{t}</Text>)}
              </View>
              <View style={styles.cardActions}>
                <Text style={styles.actionBtn}>❤ {echo.likes}</Text>
                <Text style={styles.actionBtn}>💬 {echo.comments}</Text>
                <Text style={styles.actionBtn}>🔃 Partager</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F3FF' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#1a1a2e', marginBottom: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 20, elevation: 2 },
  searchInput: { flex: 1, fontSize: 15, color: '#333' },
  clearBtn: { fontSize: 16, color: '#999', paddingHorizontal: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 10, marginTop: 4 },
  hScroll: { marginBottom: 20 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, gap: 6 },
  chipIcon: { fontSize: 16 },
  chipLabel: { fontSize: 13, fontWeight: '500', color: '#333' },
  emotionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  emotionCard: { width: '30%', borderRadius: 12, padding: 12, alignItems: 'center', gap: 4 },
  emotionSelected: { borderWidth: 2, borderColor: '#6B4EFF' },
  emotionEmoji: { fontSize: 24 },
  emotionLabel: { fontSize: 11, fontWeight: '500', color: '#333', textAlign: 'center' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  tagChip: { backgroundColor: '#EEE8FF', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  tagSelected: { backgroundColor: '#6B4EFF' },
  tagText: { fontSize: 13, color: '#6B4EFF', fontWeight: '500' },
  tagTextSelected: { color: '#fff' },
  empty: { alignItems: 'center', padding: 40, gap: 12 },
  emptyText: { fontSize: 15, color: '#888' },
  resetBtn: { fontSize: 14, color: '#6B4EFF', fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEE8FF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#6B4EFF' },
  authorName: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  timeText: { fontSize: 12, color: '#999' },
  cardEmoji: { fontSize: 22 },
  cardContent: { fontSize: 14, color: '#444', lineHeight: 20, marginBottom: 10 },
  cardTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  cardTag: { fontSize: 12, color: '#6B4EFF', backgroundColor: '#EEE8FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  cardActions: { flexDirection: 'row', gap: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10 },
  actionBtn: { fontSize: 13, color: '#888' },
});