import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = { count: number };

export default function CommunityBanner({ count }: Props) {
  return (
    <View style={styles.banner}>
      <Text style={styles.icon}>🏺</Text>
      <Text style={styles.text}>
        <Text style={styles.count}>{count} Jares</Text> partagées cette semaine par la communauté
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0EBFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  icon: { fontSize: 22 },
  text: { flex: 1, fontSize: 14, color: '#555', lineHeight: 20 },
  count: { fontWeight: '700', color: '#7C5CBF' },
});