import { Tabs } from "expo-router";
import { Platform } from "react-native";

export default function RootLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 0,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 12,
          height: Platform.OS === "ios" ? 80 : 64,
          paddingBottom: Platform.OS === "ios" ? 20 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: "#7C5CBF",
        tabBarInactiveTintColor: "#aaa",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="feed" options={{ tabBarLabel: "Fil", tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text> }} />
      <Tabs.Screen name="decouverte" options={{ tabBarLabel: "Découverte", tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🔍</Text> }} />
      <Tabs.Screen name="profile" options={{ tabBarLabel: "EchoProfil", tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text> }} />
      <Tabs.Screen name="decouvrir" options={{ tabBarLabel: "EchoTalk", tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🌱</Text> }} />
    </Tabs>
  );
}

import { Text } from "react-native";