import { Tabs } from 'expo-router';
import { Text, Platform } from 'react-native';

type TabIconProps = { focused: boolean; icon: string };

function TabIcon({ focused, icon }: TabIconProps) {
  return (
    <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.5 }}>
      {icon}
    </Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 12,
          height: Platform.OS === 'ios' ? 80 : 64,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#7C5CBF',
        tabBarInactiveTintColor: '#aaa',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
      }}
    >
      <Tabs.Screen name="index" options={{ tabBarLabel: 'Fil', tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="🏠" /> }} />
      <Tabs.Screen name="decouverte" options={{ tabBarLabel: 'Découverte', tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="🔍" /> }} />
      <Tabs.Screen name="profil" options={{ tabBarLabel: 'EchoProfil', tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="👤" /> }} />
      <Tabs.Screen name="decouvrir" options={{ tabBarLabel: 'EchoTalk', tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="🌱" /> }} />
    </Tabs>
  );
}