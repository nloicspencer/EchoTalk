import { router } from "expo-router";
import { signOut } from "firebase/auth";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { auth, db } from "../firebase/firebaseConfig";

type Echo = {
  id: string;
  text: string;
  emotion: string;
  createdAt: any;
  reactions: {
    heart: number;
    broken: number;
    jar: number;
  };
};

export default function ProfileScreen() {
  const [pseudo, setPseudo] = useState("");
  const [email, setEmail] = useState("");
  const [echos, setEchos] = useState<Echo[]>([]);
  const [totalReactions, setTotalReactions] = useState(0);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.replace("/");
      return;
    }
    loadProfile(user.uid);
    loadMyEchos(user.uid);
  }, []);

  const loadProfile = async (uid: string) => {
    const docSnap = await getDoc(doc(db, "users", uid));
    if (docSnap.exists()) {
      setPseudo(docSnap.data().pseudo);
      setEmail(docSnap.data().email);
    }
  };

  const loadMyEchos = async (uid: string) => {
    const q = query(
      collection(db, "echos"),
      where("authorId", "==", uid),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    const data: Echo[] = snapshot.docs.map((d) => ({
      id: d.id,
      text: d.data().text ?? "",
      emotion: d.data().emotion ?? "☀️",
      createdAt: d.data().createdAt,
      reactions: {
        heart: d.data().reactions?.heart ?? 0,
        broken: d.data().reactions?.broken ?? 0,
        jar: d.data().reactions?.jar ?? 0,
      },
    }));
    setEchos(data);

    const total = data.reduce(
      (acc, e) =>
        acc + e.reactions.heart + e.reactions.broken + e.reactions.jar,
      0
    );
    setTotalReactions(total);
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/");
  };

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/feed")}>
          <Text style={styles.backText}>← Feed</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      {/* Profil */}
      <View style={styles.profileCard}>
        <Text style={styles.pseudo}>{pseudo}</Text>
        <Text style={styles.email}>{email}</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{echos.length}</Text>
            <Text style={styles.statLabel}>Échos</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{totalReactions}</Text>
            <Text style={styles.statLabel}>Réactions reçues</Text>
          </View>
        </View>
      </View>

      {/* Mes échos */}
      <Text style={styles.sectionTitle}>Mes échos</Text>

      <FlatList
        data={echos}
        keyExtractor={(item) => item.id}
        style={styles.list}
        renderItem={({ item }) => (
          <View style={styles.echoCard}>
            <View style={styles.echoHeader}>
              <Text style={styles.echoEmotion}>{item.emotion}</Text>
            </View>
            <Text style={styles.echoText}>{item.text}</Text>
            <View style={styles.reactionsRow}>
              <Text style={styles.reactionStat}>❤️ {item.reactions.heart}</Text>
              <Text style={styles.reactionStat}>💔 {item.reactions.broken}</Text>
              <Text style={styles.reactionStat}>🫙 {item.reactions.jar}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            Tu n'as pas encore publié d'écho 🌊
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  backText: {
    color: "#0F766E",
    fontSize: 16,
    fontWeight: "600",
  },
  logoutText: {
    color: "#94A3B8",
    fontSize: 14,
  },
  profileCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  pseudo: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0F766E",
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: "#94A3B8",
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 40,
  },
  stat: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1E293B",
  },
  statLabel: {
    fontSize: 12,
    color: "#94A3B8",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 12,
  },
  list: {
    flex: 1,
  },
  echoCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  echoHeader: {
    marginBottom: 8,
  },
  echoEmotion: {
    fontSize: 20,
  },
  echoText: {
    fontSize: 16,
    color: "#1E293B",
    lineHeight: 24,
    marginBottom: 12,
  },
  reactionsRow: {
    flexDirection: "row",
    gap: 16,
  },
  reactionStat: {
    fontSize: 14,
    color: "#64748B",
  },
  emptyText: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 16,
    marginTop: 40,
  },
});