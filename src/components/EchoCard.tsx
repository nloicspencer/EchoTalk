import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Echo } from '../data/mockData';

type Props = { echo: Echo };

export default function EchoCard({ echo }: Props) {
  const [echoRep, setEchoRep] = useState(echo.echoRep);
  const [resonated, setResonated] = useState(false);

  const handleEchoRep = () => {
    setEchoRep(prev => resonated ? prev - 1 : prev + 1);
    setResonated(prev => !prev);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{echo.avatar}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.author}>{echo.author}</Text>
          <View style={styles.meta}>
            <Text style={styles.emotion}>{echo.emotion}</Text>
            <Text style={styles.timestamp}> · {echo.timestamp}</Text>
          </View>
        </View>
        <View style={styles.badges}>
          {echo.isOpen && <View style={styles.badge}><Text style={styles.badgeText}>Ouvert</Text></View>}
          {echo.isFree && <View style={[styles.badge, styles.freeBadge]}><Text style={styles.badgeText}>Libre</Text></View>}
        </View>
      </View>

      <Text style={styles.text}>{echo.text}</Text>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleEchoRep}>
          <Text style={[styles.actionIcon, resonated && styles.resonated]}>🔊</Text>
          <Text style={[styles.actionCount, resonated && styles.resonated]}>{echoRep} EchoRep</Text>
        </TouchableOpacity>
        <View style={styles.reactions}>
          {echo.reactions.map((r, i) => (
            <TouchableOpacity key={i} style={styles.reactionBtn}>
              <Text style={styles.reactionEmoji}>{r.emoji}</Text>
              <Text style={styles.reactionCount}>{r.count}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.actionBtn}>
          <Text style={styles.actionIcon}>🏺</Text>
          <Text style={styles.actionCount}>{echo.jares}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8E0FF', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarText: { fontSize: 16, fontWeight: '600', color: '#7C5CBF' },
  headerInfo: { flex: 1 },
  author: { fontSize: 15, fontWeight: '600', color: '#1a1a2e' },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  emotion: { fontSize: 12, color: '#7C5CBF', fontWeight: '500' },
  timestamp: { fontSize: 12, color: '#999' },
  badges: { flexDirection: 'row', gap: 4 },
  badge: { backgroundColor: '#F0EBFF', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  freeBadge: { backgroundColor: '#FFF0E8' },
  badgeText: { fontSize: 10, color: '#7C5CBF', fontWeight: '500' },
  text: { fontSize: 15, color: '#333', lineHeight: 22, marginBottom: 14 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionIcon: { fontSize: 16 },
  actionCount: { fontSize: 13, color: '#666' },
  resonated: { color: '#7C5CBF' },
  reactions: { flexDirection: 'row', gap: 8 },
  reactionBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  reactionEmoji: { fontSize: 16 },
  reactionCount: { fontSize: 13, color: '#666' },
});