import { router } from "expo-router";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function OnboardingScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <Text style={styles.logo}>EchoTalk</Text>
      <Text style={styles.tagline}>Là où chaque émotion trouve écho.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Bienvenue 🌊</Text>
        <Text style={styles.cardText}>
          EchoTalk n'est pas un réseau social comme les autres.
          Ici, pas de likes, pas de popularité, pas de comparaison.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Les Échos ☀️ 🌧️</Text>
        <Text style={styles.cardText}>
          Partage tes moments de vie — joies, réussites, doutes, difficultés.
          Tout ce qui mérite d'être entendu.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Les réactions ❤️ 💔 🫙</Text>
        <Text style={styles.cardText}>
          Pas de likes. Des réactions humaines. Montre que tu es là,
          que tu comprends, que tu soutiens.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>La règle d'or ✨</Text>
        <Text style={styles.quoteText}>
          "Écris comme si la personne était assise en face de toi."
        </Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          localStorage.setItem("onboarding_done", "true");
          router.replace("/feed");
        }}
      >
        <Text style={styles.buttonText}>Je rejoins EchoTalk 🌊</Text>
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
    paddingTop: 80,
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  logo: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#0F766E",
    textAlign: "center",
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: "#475569",
    textAlign: "center",
    marginBottom: 32,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F766E",
    marginBottom: 8,
  },
  cardText: {
    fontSize: 15,
    color: "#475569",
    lineHeight: 22,
  },
  quoteText: {
    fontSize: 16,
    color: "#1E293B",
    fontStyle: "italic",
    lineHeight: 24,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#0F766E",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  buttonText: {
    color: "white",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
  },
});