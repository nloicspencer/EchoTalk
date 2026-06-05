import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';

type Props = {
  activeCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
};

export default function QuickActions({ activeCategory, onCategoryChange }: Props) {
  const [showCategories, setShowCategories] = useState(false);
  const [showSolidaire, setShowSolidaire] = useState(false);

  function selectCategory(id: string | null) {
    onCategoryChange(id);
    setShowCategories(false);
  }

  const activeCategoryLabel = activeCategory
    ? CATEGORIES.find(c => c.id === activeCategory)?.label
    : null;

  return (
    <>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.btn, activeCategory !== null && styles.btnActive]}
          onPress={() => setShowCategories(true)}
        >
          <Text style={styles.btnIcon}>🎯</Text>
          <Text style={[styles.btnText, activeCategory !== null && styles.btnTextActive]}>
            {activeCategoryLabel ?? 'Catégories'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.solidaireBtn]} onPress={() => setShowSolidaire(true)}>
          <Text style={styles.btnIcon}>❤️</Text>
          <Text style={[styles.btnText, styles.solidaireBtnText]}>Écho Solidaire du mois</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showCategories} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowCategories(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>🎯 Catégories</Text>
            <View style={styles.categoriesGrid}>
              <TouchableOpacity
                style={[styles.categoryChip, activeCategory === null && styles.categoryChipActive]}
                onPress={() => selectCategory(null)}
              >
                <Text style={styles.categoryIcon}>✨</Text>
                <Text style={[styles.categoryLabel, activeCategory === null && styles.categoryLabelActive]}>
                  Tous les échos
                </Text>
              </TouchableOpacity>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryChip, activeCategory === cat.id && styles.categoryChipActive]}
                  onPress={() => selectCategory(cat.id)}
                >
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <Text style={[styles.categoryLabel, activeCategory === cat.id && styles.categoryLabelActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showSolidaire} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowSolidaire(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>❤️ Écho Solidaire du mois</Text>
            <View style={styles.solidaireCard}>
              <View style={styles.solidaireHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{ECHO_SOLIDAIRE.author[0]}</Text>
                </View>
                <View>
                  <Text style={styles.solidaireAuthor}>{ECHO_SOLIDAIRE.author}</Text>
                  <Text style={styles.solidaireEmotion}>{ECHO_SOLIDAIRE.emotion}</Text>
                </View>
              </View>
              <Text style={styles.solidaireText}>{ECHO_SOLIDAIRE.text}</Text>
              <Text style={styles.solidaireRep}>🔊 {ECHO_SOLIDAIRE.echoRep} EchoRep</Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, gap: 10 },
  btn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  btnActive: { backgroundColor: '#EDE8FF', borderWidth: 1.5, borderColor: '#7C5CBF' },
  solidaireBtn: { backgroundColor: '#FFF0F0' },
  btnIcon: { fontSize: 18 },
  btnText: { fontSize: 13, fontWeight: '600', color: '#333' },
  btnTextActive: { color: '#7C5CBF' },
  solidaireBtnText: { color: '#C0392B' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e', marginBottom: 16 },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F0EBFF', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
  },
  categoryChipActive: { backgroundColor: '#7C5CBF' },
  categoryIcon: { fontSize: 18 },
  categoryLabel: { fontSize: 14, fontWeight: '500', color: '#7C5CBF' },
  categoryLabelActive: { color: '#fff' },
  solidaireCard: { backgroundColor: '#FFF9F9', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#FFD6D6' },
  solidaireHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFD6D6', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#C0392B' },
  solidaireAuthor: { fontSize: 15, fontWeight: '600', color: '#1a1a2e' },
  solidaireEmotion: { fontSize: 12, color: '#C0392B', fontWeight: '500' },
  solidaireText: { fontSize: 15, color: '#333', lineHeight: 22, marginBottom: 12 },
  solidaireRep: { fontSize: 13, color: '#666' },
});
