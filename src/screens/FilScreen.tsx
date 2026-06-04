import React from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CommunityBanner from '../components/CommunityBanner';
import QuickActions from '../components/QuickActions';
import PublishBox from '../components/PublishBox';
import EchoCard from '../components/EchoCard';
import { MOCK_ECHOS } from '../data/mockData';

export default function FilScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={MOCK_ECHOS}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <EchoCard echo={item} />}
        ListHeaderComponent={
          <>
            <CommunityBanner count={27} />
            <QuickActions />
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