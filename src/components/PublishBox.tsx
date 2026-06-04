import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export default function PublishBox() {
  const [text, setText] = useState('');
  const [anonymous, setAnonymous] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>V</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Partagez votre écho..."
          placeholderTextColor="#aaa"
          multiline
          value={text}
          onChangeText={setText}
        />
      </View>
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.anonBtn, anonymous && styles.anonBtnActive]}
          onPress={() => setAnonymous(p => !p)}
        >
          <Text style={[styles.anonText, anonymous && styles.anonTextActive]}>
            {anonymous ? '🎭 Anonyme' : '👤 Identifié'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.publishBtn, !text.trim() && styles.publishBtnDisabled]}
          disabled={!text.trim()}
        >
          <Text style={styles.publishBtnText}>Publier</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  inputRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#7C5CBF', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  input: { flex: 1, fontSize: 15, color: '#333', minHeight: 60, textAlignVertical: 'top' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  anonBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#ddd' },
  anonBtnActive: { borderColor: '#7C5CBF', backgroundColor: '#F0EBFF' },
  anonText: { fontSize: 13, color: '#888' },
  anonTextActive: { color: '#7C5CBF', fontWeight: '500' },
  publishBtn: { backgroundColor: '#7C5CBF', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  publishBtnDisabled: { backgroundColor: '#ccc' },
  publishBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});