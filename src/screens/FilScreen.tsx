import React from 'react';
import {
  View,
  FlatList,
  ActivityIndicator,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useEchos } from '../hooks/useEchos';
import EchoCard from '../components/EchoCard';
import PublishBox from '../components/PublishBox';
import CommunityBanner from '../components/CommunityBanner';
import QuickActions from '../components/QuickActions';
import { Echo } from '../types/Echo';

export default function FilScreen() {
  const { echos, loading } = useEchos();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c5cbf" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={echos}
        keyExtractor={(item: Echo) => item.id}
        renderItem={({ item }) => <EchoCard echo={item} />}
        ListHeaderComponent={
          <>
            <CommunityBanner />
            <PublishBox />
            <QuickActions />
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              Sois le premier à partager un écho 🌱
            </Text>
          </View>
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  list: {
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  empty: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
  },
});
