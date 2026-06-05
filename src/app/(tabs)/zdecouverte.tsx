import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  SafeAreaView,
  StatusBar,
} from 'react-native';

// ── Types ────────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  label: string;
  icon: string;
}

interface Emotion {
  id: string;
  label: string;
  emoji: string;
  color: string;
}

interface Tag {
  id: string;
  label: string;
}

interface EchoItem {
  id: string;
  author: string;
  avatar: string;
  content: string;
  emotion: string;
  emotionEmoji: string;
  tags: string[];
  likes: number;
  comments: number;
  timeAgo: string;
}

// ── Static data ───────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  { id: 'all', label: 'Tout', icon: '✨' },
  { id: 'anxiety', label: 'Anxiété', icon: '🌊' },
  { id: 'grief', label: 'Deuil', icon: '🕊️' },
  { id: 'joy', label: 'Joie', icon: '☀️' },
  { id: 'love', label: 'Amour', icon: '💙' },
  { id: 'anger', label: 'Colère', icon: '🔥' },
  { id: 'solitude', label: 'Solitude', icon: '🌙' },
];

const EMOTIONS: Emotion[] = [
  { id: 'serene', label: 'Serein·e', emoji: '😌', color: '#A8D8EA' },
  { id: 'sad', label: 'Triste', emoji: '😢', color: '#B0BEC5' },
  { id: 'anxious', label: 'Anxieux·se', emoji: '😰', color: '#FFD180' },
  { id: 'angry', label: 'En colère', emoji: '😤', color: '#FF8A80' },
  { id: 'hopeful', label: 'Plein·e d'espoir', emoji: '🌱', color: '#A5D6A7' },
  { id: 'lonely', label: 'Seul·e', emoji: '🌑', color: '#CE93D8' },
];

const POPULAR_TAGS: Tag[] = [
  { id: 't1', label: '#burnout' },
  { id: 't2', label: '#dépression' },
  { id: 't3', label: '#thérapie' },
  { id: 't4', label: '#méditation' },
  { id: 't5', label: '#gratitude' },
  { id: 't6', label: '#insomnie' },
  { id: 't7', label: '#famille' },
  { id: 't8', label: '#travail' },
];

const POPULAR_ITEMS: EchoItem[] = [
  {
    id: 'e1',
    author: 'Marie L.',
    avatar: 'M',
    content: 'Aujourd'hui j'ai réussi à sortir du lit malgré tout. Petite victoire, mais victoire quand même. 💪',
    emotion: 'hopeful',
    emotionEmoji: '🌱',
    tags: ['#dépression', '#petitesvictoires'],
    likes: 124,
    comments: 38,
    timeAgo: 'il y a 2h',
  },
  {
    id: 'e2',
    author: 'Théo R.',
    avatar: 'T',
    content: 'L'anxiété au travail prend tellement de place. Comment vous faites pour déconnecter le soir ?',
    emotion: 'anxious',
    emotionEmoji: '😰',
    tags: ['#anxiété', '#burnout', '#travail'],
    likes: 89,
    comments: 61,
    timeAgo: 'il y a 4h',
  },
  {
    id: 'e3',
    author: 'Camille D.',
    avatar: 'C',
    content: 'Trois mois de thérapie. Je commence enfin à voir la lumière au bout du tunnel. Merci à cette communauté. 🌟',
    emotion: 'hopeful',
    emotionEmoji: '🌱',
    tags: ['#thérapie', '#guérison'],
    likes: 203,
    comments: 45,
    timeAgo: 'il y a 6h',
  },
  {
    id: 'e4',
    author: 'Léa M.',
    avatar: 'L',
    content: 'La solitude du dimanche soir... est-ce que quelqu'un d'autre ressent ça ?',
    emotion: 'lonely',
    emotionEmoji: '🌑',
    tags: ['#solitude', '#dimanche'],
    likes: 156,
    comments: 92,
    timeAgo: 'il y a 9h',
  },
  {
    id: 'e5',
    author: 'Julien B.',
    avatar: 'J',
    content: 'La méditation m'a changé la vie. 10 minutes chaque matin et tout paraît différent.',
    emotion: 'serene',
    emotionEmoji: '😌',
    tags: ['#méditation', '#bienêtre'],
    likes: 178,
    comments: 33,
    timeAgo: 'il y a 12h',
  },
];

// ── Avatar component ──────────────────────────────────────────────────────────

const Avatar: React.FC<{ letter: string; color: string }> = ({ letter, color }) => (
  <View style={[styles.avatar, { backgroundColor: color }]}>
    <Text style={styles.avatarText}>{letter}</Text>
  </View>
);

// ── EchoCard component ────────────────────────────────────────────────────────

const EMOTION_COLORS: Record<string, string> = {
  serene: '#A8D8EA',
  sad: '#B0BEC5',
  anxious: '#FFD180',
  angry: '#FF8A80',
  hopeful: '#A5D6A7',
  lonely: '#CE93D8',
};

const AVATAR_COLORS = ['#7C83FD', '#96BAFF', '#77D8D8', '#F7AEF8', '#FFC8A2', '#B8F0E6'];

const EchoCard: React.FC<{ item: EchoItem }> = ({ item }) => {
  const [liked, setLiked] = useState(false);
  const accentColor = EMOTION_COLORS[item.emotion] ?? '#7C83FD';
  const avatarColor = AVATAR_COLORS[item.id.charCodeAt(1) % AVATAR_COLORS.length];

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85}>
      <View style={[styles.cardAccent, { backgroundColor: accentColor }]} />
      <View style={styles.cardContent}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <Avatar letter={item.avatar} color={avatarColor} />
          <View style={styles.cardMeta}>
            <Text style={styles.cardAuthor}>{item.author}</Text>
            <Text style={styles.cardTime}>{item.timeAgo}</Text>
          </View>
          <View style={[styles.emotionBadge, { backgroundColor: accentColor + '33' }]}>
            <Text style={styles.emotionBadgeText}>{item.emotionEmoji}</Text>
          </View>
        </View>

        {/* Body */}
        <Text style={styles.cardText}>{item.content}</Text>

        {/* Tags */}
        <View style={styles.cardTags}>
          {item.tags.map((tag) => (
            <TouchableOpacity key={tag} style={styles.cardTag}>
              <Text style={styles.cardTagText}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setLiked((prev) => !prev)}
          >
            <Text style={[styles.actionIcon, liked && styles.actionIconActive]}>
              {liked ? '💙' : '🤍'}
            </Text>
            <Text style={[styles.actionCount, liked && styles.actionCountActive]}>
              {item.likes + (liked ? 1 : 0)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionCount}>{item.comments}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionIcon}>🔗</Text>
            <Text style={styles.actionCount}>Partager</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ── Main screen ───────────────────────────────────────────────────────────────

export default function DecouverteScreen() {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  const toggleTag = useCallback((tagId: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      next.has(tagId) ? next.delete(tagId) : next.add(tagId);
      return next;
    });
  }, []);

  const filteredItems = POPULAR_ITEMS.filter((item) => {
    if (query && !item.content.toLowerCase().includes(query.toLowerCase())) return false;
    if (selectedEmotion && item.emotion !== selectedEmotion) return false;
    if (selectedTags.size > 0) {
      const tagLabels = POPULAR_TAGS.filter((t) => selectedTags.has(t.id)).map((t) => t.label);
      if (!tagLabels.some((tl) => item.tags.includes(tl))) return false;
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Découverte</Text>
          <Text style={styles.headerSubtitle}>Explorez les échos de la communauté</Text>
        </View>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un écho, une émotion…"
            placeholderTextColor="#AAAAAA"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Catégories</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillRow}
          >
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryPill, active && styles.categoryPillActive]}
                  onPress={() => setSelectedCategory(cat.id)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Emotions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Comment vous sentez-vous ?</Text>
          <View style={styles.emotionGrid}>
            {EMOTIONS.map((emotion) => {
              const active = selectedEmotion === emotion.id;
              return (
                <TouchableOpacity
                  key={emotion.id}
                  style={[
                    styles.emotionCard,
                    { borderColor: emotion.color },
                    active && { backgroundColor: emotion.color },
                  ]}
                  onPress={() => setSelectedEmotion(active ? null : emotion.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emotionEmoji}>{emotion.emoji}</Text>
                  <Text style={[styles.emotionLabel, active && styles.emotionLabelActive]}>
                    {emotion.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Tags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags populaires</Text>
          <View style={styles.tagCloud}>
            {POPULAR_TAGS.map((tag) => {
              const active = selectedTags.has(tag.id);
              return (
                <TouchableOpacity
                  key={tag.id}
                  style={[styles.tag, active && styles.tagActive]}
                  onPress={() => toggleTag(tag.id)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.tagText, active && styles.tagTextActive]}>
                    {tag.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Popular items */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>
              {filteredItems.length > 0
                ? `${filteredItems.length} écho${filteredItems.length > 1 ? 's' : ''} trouvé${filteredItems.length > 1 ? 's' : ''}`
                : 'Aucun résultat'}
            </Text>
            {(selectedEmotion || selectedTags.size > 0 || query) && (
              <TouchableOpacity
                onPress={() => {
                  setQuery('');
                  setSelectedEmotion(null);
                  setSelectedTags(new Set());
                  setSelectedCategory('all');
                }}
              >
                <Text style={styles.resetBtn}>Réinitialiser</Text>
              </TouchableOpacity>
            )}
          </View>

          {filteredItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🔇</Text>
              <Text style={styles.emptyTitle}>Aucun écho trouvé</Text>
              <Text style={styles.emptySubtitle}>
                Essayez d'autres filtres ou partagez le premier écho sur ce sujet.
              </Text>
            </View>
          ) : (
            filteredItems.map((item) => <EchoCard key={item.id} item={item} />)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A2E',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A2E',
    padding: 0,
  },
  searchClear: {
    fontSize: 14,
    color: '#AAAAAA',
    paddingLeft: 8,
  },

  // Sections
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 12,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resetBtn: {
    fontSize: 13,
    color: '#7C83FD',
    fontWeight: '500',
  },

  // Categories
  pillRow: {
    gap: 10,
    paddingRight: 20,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryPillActive: {
    backgroundColor: '#7C83FD',
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#555',
  },
  categoryLabelActive: {
    color: '#FFFFFF',
  },

  // Emotions grid
  emotionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  emotionCard: {
    width: '30%',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
  },
  emotionEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  emotionLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#555',
    textAlign: 'center',
  },
  emotionLabelActive: {
    color: '#1A1A2E',
    fontWeight: '700',
  },

  // Tags
  tagCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  tagActive: {
    backgroundColor: '#7C83FD',
    borderColor: '#7C83FD',
  },
  tagText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  tagTextActive: {
    color: '#FFFFFF',
  },

  // Cards
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 14,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  cardAccent: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  cardMeta: {
    flex: 1,
    marginLeft: 10,
  },
  cardAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  cardTime: {
    fontSize: 11,
    color: '#AAAAAA',
    marginTop: 1,
  },
  emotionBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  emotionBadgeText: {
    fontSize: 14,
  },
  cardText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 21,
    marginBottom: 10,
  },
  cardTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  cardTag: {
    backgroundColor: '#F0F0FF',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cardTagText: {
    fontSize: 11,
    color: '#7C83FD',
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionIcon: {
    fontSize: 14,
  },
  actionIconActive: {
    fontSize: 14,
  },
  actionCount: {
    fontSize: 13,
    color: '#888',
  },
  actionCountActive: {
    color: '#7C83FD',
    fontWeight: '600',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
});
