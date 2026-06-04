import { router } from "expo-router";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { auth, db } from "../firebase/firebaseConfig";

export default function HomeScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [pseudo, setPseudo] = useState<string>("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPseudo(docSnap.data().pseudo);
        }
        const onboardingDone = localStorage.getItem("onboarding_done");
if (onboardingDone) {
  router.replace("/feed");
} else {
  router.replace("/onboarding");
}
      }
    });

    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>EchoTalk</Text>

      {user && pseudo ? (
        <Text style={styles.greeting}>Bonjour {pseudo} 🌊</Text>
      ) : null}

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
        <TouchableOpacity style={styles.loginButton} onPress={handleLogout}>
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
  greeting: {
    fontSize: 18,
    color: "#0F766E",
    marginBottom: 20,
    fontWeight: "600",
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