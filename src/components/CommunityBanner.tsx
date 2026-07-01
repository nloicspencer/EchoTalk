import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function CommunityBanner() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>🌍 Communauté EchoTalk</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  text: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
  },
});
