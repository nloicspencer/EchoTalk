import React, { useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CommunityBanner from '../components/CommunityBanner';
import QuickActions from '../components/QuickActions';
import PublishBox from '../components/PublishBox';
import EchoCard from '../components/EchoCard';
import { MOCK_ECHOS } from '../data/mockData';

export default function FilScreen() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const echos = activeCategory
    ? MOCK_ECHOS.filter(e => e.category === activeCategory)
    : MOCK_ECHOS;

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
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F4FF' },
  list: { paddingTop: 12, paddingBottom: 16 },
});
