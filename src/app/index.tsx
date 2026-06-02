import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>EchoTalk</Text>

      <Text style={styles.slogan}>
        Le réseau social où chaque émotion trouve écho et soutien
      </Text>

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