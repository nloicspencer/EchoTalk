import React, { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CommunityBanner from '../components/CommunityBanner';
import QuickActions from '../components/QuickActions';
import PublishBox from '../components/PublishBox';
import EchoCard from '../components/EchoCard';
import { useEchos } from '../hooks/useEchos';

export default function FilScreen() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { echos, loading } = useEchos(activeCategory);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={echos}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <EchoCard echo={item} />}
        ListHeaderComponent={
          <>
            <CommunityBanner count={27} />
            <QuickActions
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
            />
            <PublishBox />
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color="#7C5CBF" />
            </View>
          ) : null
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F4FF' },
  list: { paddingTop: 12, paddingBottom: 16 },
  loader: { paddingTop: 40, alignItems: 'center' },
});
