import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "../firebase/firebaseConfig";

export default function HomeScreen() {
  const handleLogout = async () => {
  await signOut(auth);
  router.replace("/");
};
  const [user, setUser] = useState<User | null>(null);

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
    setUser(currentUser);
  });

  return unsubscribe;
}, []);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>EchoTalk</Text>
      {user && (
  <Text
    style={{
      fontSize: 18,
      color: "#0F766E",
      marginBottom: 20,
    }}
  >
    Bonjour {user.email}
  </Text>
)}

      <Text style={styles.slogan}>
        Le réseau social où chaque émotion trouve écho et soutien
      </Text>

      {!user ? (
  <>
    <TouchableOpacity
      style={styles.loginButton}
      onPress={() => router.push("/login")}
    >
      <Text style={styles.loginText}>Se connecter</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.registerButton}
      onPress={() => router.push("/register")}
    >
      <Text style={styles.registerText}>Créer un compte</Text>
    </TouchableOpacity>
  </>
) : (
  <TouchableOpacity
    style={styles.loginButton}
    onPress={handleLogout}
  >
    <Text style={styles.loginText}>Déconnexion</Text>
  </TouchableOpacity>
)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  logo: {
    fontSize: 42,
    fontWeight: "bold",
    color: "#0F766E",
    marginBottom: 20,
  },

  slogan: {
    textAlign: "center",
    fontSize: 18,
    color: "#475569",
    marginBottom: 50,
  },

  loginButton: {
    backgroundColor: "#0F766E",
    width: "100%",
    padding: 16,
    borderRadius: 12,
    marginBottom: 15,
  },

  loginText: {
    color: "white",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
  },

  registerButton: {
    borderWidth: 2,
    borderColor: "#0F766E",
    width: "100%",
    padding: 16,
    borderRadius: 12,
  },

  registerText: {
    color: "#0F766E",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
  },
});