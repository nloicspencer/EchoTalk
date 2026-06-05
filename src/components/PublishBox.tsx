import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function PublishBox() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>📝 Partager un écho...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f0ff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  placeholder: {
    color: '#9b7fd4',
    fontSize: 15,
  },
});
