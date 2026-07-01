import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, Platform } from 'react-native';

import FilScreen from '../screens/FilScreen';
import DecouverteScreen from '../screens/DecouverteScreen';
import EchoProfilScreen from '../screens/EchoProfilScreen';
import DecouvrirEchoTalkScreen from '../screens/DecouvrirEchoTalkScreen';

const Tab = createBottomTabNavigator();

type TabIconProps = { focused: boolean; icon: string; label: string };

function TabIcon({ focused, icon, label }: TabIconProps) {
  return (
    <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.5 }}>
      {icon}
    </Text>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
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
        <Tab.Screen name="Fil" component={FilScreen} options={{ tabBarLabel: 'Fil', tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="🏠" label="Fil" /> }} />
        <Tab.Screen name="Decouverte" component={DecouverteScreen} options={{ tabBarLabel: 'Découverte', tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="🔍" label="Découverte" /> }} />
        <Tab.Screen name="EchoProfil" component={EchoProfilScreen} options={{ tabBarLabel: 'EchoProfil', tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="👤" label="EchoProfil" /> }} />
        <Tab.Screen name="DecouvrirEchoTalk" component={DecouvrirEchoTalkScreen} options={{ tabBarLabel: 'EchoTalk', tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="🌱" label="EchoTalk" /> }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}