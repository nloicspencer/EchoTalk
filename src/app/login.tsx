import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const handleLogin = async () => {
  console.log("Bouton connexion cliqué");

  try {
    const userCredential =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    console.log(
      "Connexion réussie :",
      userCredential.user
    );

    window.alert("Connexion réussie !");
window.location.href = "/";
  } catch (error: any) {
    console.log(
      "ERREUR CONNEXION :",
      error
    );

    window.alert(
      "Email ou mot de passe incorrect"
    );
  }
};
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connexion</Text>

      <TextInput
  style={styles.input}
  placeholder="Adresse email"
  value={email}
  onChangeText={setEmail}
  autoCapitalize="none"
/>

<TextInput
  style={styles.input}
  placeholder="Mot de passe"
  value={password}
  onChangeText={setPassword}
  secureTextEntry
/>

      <TouchableOpacity
  style={styles.button}
  onPress={handleLogin}
>
        <Text style={styles.buttonText}>Se connecter</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    padding: 24,
  },

  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#0F766E",
    marginBottom: 30,
    textAlign: "center",
  },

  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
  },

  button: {
    backgroundColor: "#0F766E",
    padding: 16,
    borderRadius: 12,
  },

  buttonText: {
    color: "white",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
  },
});