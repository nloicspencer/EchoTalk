import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function QuickActions() {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.action}>
        <Text style={styles.label}>🎭 Tonalité</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.action}>
        <Text style={styles.label}>🌊 Diffusion</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.action}>
        <Text style={styles.label}>🤝 Interaction</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  action: {
    flex: 1,
    backgroundColor: '#f0f0f5',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    color: '#444',
  },
});
