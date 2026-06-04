import { router } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../firebase/firebaseConfig";

const OISEAUX = [
  "Albatros", "Colibri", "Faucon", "Héron", "Mésange", "Hibou", "Rougegorge",
  "Aigle", "Cygne", "Martin-Pêcheur", "Moineau", "Hirondelle", "Pélican",
  "Flamant", "Merle", "Tourterelle", "Geai", "Grue", "Pinson", "Rossignol",
  "Balbuzard", "Busard", "Circaète", "Épervier", "Fauvette", "Gorgebleue",
  "Huppe", "Ibis", "Jaseur", "Kite", "Linotte", "Macareux", "Niverolle",
  "Outarde", "Perdrix", "Quiscale", "Rollier", "Sterne", "Traquet", "Vanneau",
];

const LIEUX = [
  "Horizon", "Azur", "Aurore", "Lagune", "Boréale", "Cascade", "Émeraude",
  "Brume", "Saphir", "Rivage", "Solstice", "Zénith", "Crépuscule", "Opale",
  "Céleste", "Arctique", "Mistral", "Abysses", "Équinoxe", "Lumière",
  "Cristal", "Nébuleuse", "Solaire", "Véga", "Opaline", "Polaire",
];

const generatePseudo = () => {
  const oiseau = OISEAUX[Math.floor(Math.random() * OISEAUX.length)];
  const lieu = LIEUX[Math.floor(Math.random() * LIEUX.length)];
  return `${oiseau} ${lieu}`;
};

const getUniquePseudo = async (): Promise<string> => {
  let pseudo = generatePseudo();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await getDoc(doc(db, "pseudos", pseudo));
    if (!existing.exists()) return pseudo;
    const number = Math.floor(Math.random() * 9000) + 1000;
    pseudo = `${generatePseudo()} ${number}`;
    attempts++;
  }
  return pseudo;
};

const isAdult = (day: string, month: string, year: string): boolean => {
  const d = parseInt(day);
  const m = parseInt(month);
  const y = parseInt(year);
  if (isNaN(d) || isNaN(m) || isNaN(y)) return false;
  const birthDate = new Date(y, m - 1, d);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    return age - 1 >= 18;
  }
  return age >= 18;
};

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [attested, setAttested] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Erreur", "Veuillez renseigner votre prénom et nom");
      return;
    }

    if (!birthDay || !birthMonth || !birthYear) {
      Alert.alert("Erreur", "Veuillez renseigner votre date de naissance complète");
      return;
    }

    if (!isAdult(birthDay, birthMonth, birthYear)) {
      Alert.alert("Accès refusé", "Vous devez avoir au moins 18 ans pour rejoindre EchoTalk");
      return;
    }

    if (!email || !password) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Erreur", "Les mots de passe ne correspondent pas");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Erreur", "Le mot de passe doit faire au moins 6 caractères");
      return;
    }

    if (!attested) {
      Alert.alert("Erreur", "Veuillez attester que vos informations sont exactes");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const pseudo = await getUniquePseudo();

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        pseudo,
        email: email.toLowerCase().trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate: `${birthDay.padStart(2, "0")}/${birthMonth.padStart(2, "0")}/${birthYear}`,
        attested: true,
        createdAt: serverTimestamp(),
      });

      await setDoc(doc(db, "pseudos", pseudo), {
        uid: user.uid,
        createdAt: serverTimestamp(),
      });

      router.replace("/onboarding");

    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        Alert.alert("Erreur", "Cet email est déjà utilisé");
      } else if (error.code === "auth/invalid-email") {
        Alert.alert("Erreur", "Adresse email invalide");
      } else {
        Alert.alert("Erreur", "Une erreur est survenue. Réessaie.");
      }
    }

    setLoading(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Créer un compte</Text>
      <Text style={styles.subtitle}>
        Ton pseudonyme EchoTalk sera généré automatiquement 🌊
      </Text>

      {/* Identité */}
      <Text style={styles.sectionLabel}>Identité (privée)</Text>

      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.inputHalf]}
          placeholder="Prénom"
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
        />
        <TextInput
          style={[styles.input, styles.inputHalf]}
          placeholder="Nom"
          value={lastName}
          onChangeText={setLastName}
          autoCapitalize="words"
        />
      </View>

      <Text style={styles.fieldLabel}>Date de naissance</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.inputThird]}
          placeholder="JJ"
          value={birthDay}
          onChangeText={setBirthDay}
          keyboardType="numeric"
          maxLength={2}
        />
        <TextInput
          style={[styles.input, styles.inputThird]}
          placeholder="MM"
          value={birthMonth}
          onChangeText={setBirthMonth}
          keyboardType="numeric"
          maxLength={2}
        />
        <TextInput
          style={[styles.input, styles.inputThird]}
          placeholder="AAAA"
          value={birthYear}
          onChangeText={setBirthYear}
          keyboardType="numeric"
          maxLength={4}
        />
      </View>

      {/* Connexion */}
      <Text style={styles.sectionLabel}>Connexion</Text>

      <TextInput
        style={styles.input}
        placeholder="Adresse email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="Confirmer le mot de passe"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />

      {/* Attestation */}
      <TouchableOpacity
        style={styles.attestRow}
        onPress={() => setAttested(!attested)}
      >
        <View style={[styles.checkbox, attested && styles.checkboxChecked]}>
          {attested && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.attestText}>
          J'atteste que les informations renseignées sont exactes et m'appartiennent.
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleRegister}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Création en cours..." : "Créer mon compte"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.loginLink}
        onPress={() => router.push("/login")}
      >
        <Text style={styles.loginLinkText}>
          Déjà un compte ? Se connecter
        </Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#0F766E",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 8,
  },
  fieldLabel: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 8,
    fontWeight: "500",
  },
  row: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 0,
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    fontSize: 16,
  },
  inputHalf: {
    flex: 1,
  },
  inputThird: {
    flex: 1,
  },
  attestRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 24,
    marginTop: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: "#0F766E",
    borderColor: "#0F766E",
  },
  checkmark: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  attestText: {
    flex: 1,
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
  },
  button: {
    backgroundColor: "#0F766E",
    padding: 16,
    borderRadius: 12,
    marginTop: 4,
  },
  buttonDisabled: {
    backgroundColor: "#94A3B8",
  },
  buttonText: {
    color: "white",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
  },
  loginLink: {
    marginTop: 20,
    alignItems: "center",
  },
  loginLinkText: {
    color: "#0F766E",
    fontSize: 15,
  },
});