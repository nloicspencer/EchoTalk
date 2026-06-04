import { router } from "expo-router";
import { signOut } from "firebase/auth";
import {
    addDoc,
    arrayUnion,
    collection,
    doc,
    getDoc,
    getDocs,
    increment,
    orderBy,
    query,
    serverTimestamp,
    Timestamp,
    updateDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { auth, db } from "../firebase/firebaseConfig";

const SUGGESTIONS = [
  "🌿 Je comprends",
  "☀️ Bravo",
  "🤝 Courage",
  "🫙 Je suis avec toi",
  "🌱 Merci",
];

const MAX_VISIBLE_REPS = 3;
const MAX_REOUVERTURES = 3;

type EchoRep = {
  id: string;
  authorPseudo: string;
  text: string;
  createdAt: any;
};

type Echo = {
  id: string;
  authorPseudo: string;
  authorId: string;
  text: string;
  emotion: string;
  type: "libre" | "ouvert";
  cercle: number | null;
  duree: number | null;
  expiresAt: any;
  closed: boolean;
  reouvertures: number;
  participants: string[];
  createdAt: any;
  reactions: { heart: number; broken: number; jar: number };
};

export default function FeedScreen() {
  const [echos, setEchos] = useState<Echo[]>([]);
  const [text, setText] = useState("");
  const [emotion, setEmotion] = useState("☀️");
  const [echoType, setEchoType] = useState<"libre" | "ouvert">("libre");
  const [cercle, setCercle] = useState<3 | 5 | 8>(3);
  const [duree, setDuree] = useState<1 | 3 | 6>(1);
  const [pseudo, setPseudo] = useState("");
  const [loading, setLoading] = useState(false);
  const [totalJars, setTotalJars] = useState(0);
  const [showFormExpanded, setShowFormExpanded] = useState(false);
  const [echoReps, setEchoReps] = useState<Record<string, EchoRep[]>>({});
  const [showAllReps, setShowAllReps] = useState<Record<string, boolean>>({});
  const [repText, setRepText] = useState<Record<string, string>>({});
  const [repLoading, setRepLoading] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { router.replace("/"); return; }
    loadPseudo(user.uid);
    loadEchos();
    loadTotalJars();
  }, []);

  const loadPseudo = async (uid: string) => {
    const docSnap = await getDoc(doc(db, "users", uid));
    if (docSnap.exists()) setPseudo(docSnap.data().pseudo);
  };

  const loadTotalJars = async () => {
    const docSnap = await getDoc(doc(db, "stats", "global"));
    if (docSnap.exists()) setTotalJars(docSnap.data().jars ?? 0);
  };

  const loadEchos = async () => {
    const q = query(collection(db, "echos"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const data: Echo[] = snapshot.docs.map((d) => ({
      id: d.id,
      authorPseudo: d.data().authorPseudo ?? "Anonyme",
      authorId: d.data().authorId ?? "",
      text: d.data().text ?? "",
      emotion: d.data().emotion ?? "☀️",
      type: d.data().type ?? "libre",
      cercle: d.data().cercle ?? null,
      duree: d.data().duree ?? null,
      expiresAt: d.data().expiresAt ?? null,
      closed: d.data().closed ?? false,
      reouvertures: d.data().reouvertures ?? 0,
      participants: d.data().participants ?? [],
      createdAt: d.data().createdAt,
      reactions: {
        heart: d.data().reactions?.heart ?? 0,
        broken: d.data().reactions?.broken ?? 0,
        jar: d.data().reactions?.jar ?? 0,
      },
    }));
    setEchos(data);
    data.forEach((echo) => {
      if (echo.type === "ouvert") loadEchoReps(echo.id);
    });
  };

  const loadEchoReps = async (echoId: string) => {
    const q = query(
      collection(db, "echos", echoId, "echoreps"),
      orderBy("createdAt", "asc")
    );
    const snapshot = await getDocs(q);
    const data: EchoRep[] = snapshot.docs.map((d) => ({
      id: d.id,
      authorPseudo: d.data().authorPseudo ?? "Anonyme",
      text: d.data().text ?? "",
      createdAt: d.data().createdAt,
    }));
    setEchoReps((prev) => ({ ...prev, [echoId]: data }));
  };

  const isExpired = (echo: Echo): boolean => {
    if (!echo.expiresAt) return false;
    const expires = echo.expiresAt.toDate ? echo.expiresAt.toDate() : new Date(echo.expiresAt);
    return new Date() > expires;
  };

  const isClosed = (echo: Echo): boolean => {
    return echo.closed || isExpired(echo);
  };

  const getTimeRemaining = (echo: Echo): string => {
    if (!echo.expiresAt) return "";
    if (echo.closed) return "Fermé manuellement";
    const expires = echo.expiresAt.toDate ? echo.expiresAt.toDate() : new Date(echo.expiresAt);
    const now = new Date();
    const diff = expires.getTime() - now.getTime();
    if (diff <= 0) return "Expiré";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days >= 1) return `⏱ ${days}j restant${days > 1 ? "s" : ""}`;
    return `⏱ ${hours}h restante${hours > 1 ? "s" : ""}`;
  };

  const handleCloseCercle = async (echo: Echo) => {
    await updateDoc(doc(db, "echos", echo.id), { closed: true });
    setEchos((prev) =>
      prev.map((e) => e.id === echo.id ? { ...e, closed: true } : e)
    );
  };

  const handleReouvrir = async (echo: Echo) => {
    if (echo.reouvertures >= MAX_REOUVERTURES) return;
    const newExpires = new Date();
    newExpires.setDate(newExpires.getDate() + (echo.duree ?? 1));
    await updateDoc(doc(db, "echos", echo.id), {
      closed: false,
      reouvertures: echo.reouvertures + 1,
      expiresAt: Timestamp.fromDate(newExpires),
    });
    setEchos((prev) =>
      prev.map((e) =>
        e.id === echo.id
          ? { ...e, closed: false, reouvertures: e.reouvertures + 1, expiresAt: Timestamp.fromDate(newExpires) }
          : e
      )
    );
  };

  const handleSendRep = async (echo: Echo) => {
    const text = repText[echo.id] ?? "";
    if (!text.trim()) return;
    const user = auth.currentUser;
    if (!user) return;
    const dejaParticipant = echo.participants.includes(user.uid);
    if (!dejaParticipant && echo.participants.length >= echo.cercle!) return;
    setRepLoading(true);
    await addDoc(collection(db, "echos", echo.id, "echoreps"), {
      authorId: user.uid,
      authorPseudo: pseudo,
      text: text.trim(),
      createdAt: serverTimestamp(),
    });
    if (!dejaParticipant) {
      await updateDoc(doc(db, "echos", echo.id), { participants: arrayUnion(user.uid) });
      setEchos((prev) =>
        prev.map((e) =>
          e.id === echo.id ? { ...e, participants: [...e.participants, user.uid] } : e
        )
      );
    }
    setRepText((prev) => ({ ...prev, [echo.id]: "" }));
    await loadEchoReps(echo.id);
    setRepLoading(false);
  };

  const handleSuggestion = async (echo: Echo, suggestion: string) => {
    const user = auth.currentUser;
    if (!user) return;
    const dejaParticipant = echo.participants.includes(user.uid);
    if (!dejaParticipant && echo.participants.length >= echo.cercle!) return;
    setRepLoading(true);
    await addDoc(collection(db, "echos", echo.id, "echoreps"), {
      authorId: user.uid,
      authorPseudo: pseudo,
      text: suggestion,
      createdAt: serverTimestamp(),
    });
    if (!dejaParticipant) {
      await updateDoc(doc(db, "echos", echo.id), { participants: arrayUnion(user.uid) });
      setEchos((prev) =>
        prev.map((e) =>
          e.id === echo.id ? { ...e, participants: [...e.participants, user.uid] } : e
        )
      );
    }
    await loadEchoReps(echo.id);
    setRepLoading(false);
  };

  const handleReaction = async (echoId: string, type: "heart" | "broken" | "jar") => {
    await updateDoc(doc(db, "echos", echoId), { [`reactions.${type}`]: increment(1) });
    if (type === "jar") {
      await updateDoc(doc(db, "stats", "global"), { jars: increment(1) });
      setTotalJars((prev) => prev + 1);
    }
    setEchos((prev) =>
      prev.map((e) =>
        e.id === echoId
          ? { ...e, reactions: { ...e.reactions, [type]: e.reactions[type] + 1 } }
          : e
      )
    );
  };

  const handlePublish = async () => {
    if (!text.trim()) return;
    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);

    let expiresAt = null;
    if (echoType === "ouvert") {
      const exp = new Date();
      exp.setDate(exp.getDate() + duree);
      expiresAt = Timestamp.fromDate(exp);
    }

    await addDoc(collection(db, "echos"), {
      authorId: user.uid,
      authorPseudo: pseudo,
      text: text.trim(),
      emotion,
      type: echoType,
      cercle: echoType === "ouvert" ? cercle : null,
      duree: echoType === "ouvert" ? duree : null,
      expiresAt,
      closed: false,
      reouvertures: 0,
      participants: [],
      createdAt: serverTimestamp(),
      reactions: { heart: 0, broken: 0, jar: 0 },
    });
    setText("");
    setEchoType("libre");
    setCercle(3);
    setDuree(1);
    setShowFormExpanded(false);
    await loadEchos();
    setLoading(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/");
  };

  const canReply = (echo: Echo) => {
    const user = auth.currentUser;
    if (!user || echo.type !== "ouvert") return false;
    if (isClosed(echo)) return false;
    return echo.participants.includes(user.uid) || echo.participants.length < echo.cercle!;
  };

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push("/profile")}>
          <Text style={styles.logo}>EchoTalk</Text>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          {pseudo ? <Text style={styles.greeting}>{pseudo}</Text> : null}
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logoutText}>Déco</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Puits */}
      <View style={styles.wellBox}>
        <Text style={styles.wellEmoji}>🫙</Text>
        <View>
          <Text style={styles.wellCount}>{totalJars.toLocaleString()} jarres partagées</Text>
          <Text style={styles.wellLabel}>cette semaine par la communauté</Text>
        </View>
      </View>

      {/* Formulaire */}
      <View style={styles.publishBox}>
        {!showFormExpanded ? (
          <TouchableOpacity style={styles.publishClosed} onPress={() => setShowFormExpanded(true)}>
            <Text style={styles.publishClosedText}>Partage ton écho... ✚</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.formRow}>
              <View style={styles.emotionRow}>
                <TouchableOpacity
                  style={[styles.emotionBtn, emotion === "☀️" && styles.emotionActive]}
                  onPress={() => setEmotion("☀️")}
                ><Text>☀️</Text></TouchableOpacity>
                <TouchableOpacity
                  style={[styles.emotionBtn, emotion === "🌧️" && styles.emotionActive]}
                  onPress={() => setEmotion("🌧️")}
                ><Text>🌧️</Text></TouchableOpacity>
              </View>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[styles.typeBtn, echoType === "libre" && styles.typeBtnActive]}
                  onPress={() => setEchoType("libre")}
                >
                  <Text style={[styles.typeBtnText, echoType === "libre" && styles.typeBtnTextActive]}>🌊 Libre</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, echoType === "ouvert" && styles.typeBtnActive]}
                  onPress={() => setEchoType("ouvert")}
                >
                  <Text style={[styles.typeBtnText, echoType === "ouvert" && styles.typeBtnTextActive]}>🤝 Ouvert</Text>
                </TouchableOpacity>
              </View>
            </View>

            {echoType === "ouvert" && (
              <>
                <View style={styles.cercleRow}>
                  {([3, 5, 8] as const).map((n) => (
                    <TouchableOpacity
                      key={n}
                      style={[styles.cercleBtn, cercle === n && styles.cercleBtnActive]}
                      onPress={() => setCercle(n)}
                    >
                      <Text>{n === 3 ? "🌙" : n === 5 ? "🌿" : "🌊"}</Text>
                      <Text style={[styles.cercleBtnText, cercle === n && styles.cercleBtnTextActive]}>
                        {n === 3 ? "Petit" : n === 5 ? "Moyen" : "Large"} · {n}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.dureeRow}>
                  {([1, 3, 6] as const).map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.dureeBtn, duree === d && styles.dureeBtnActive]}
                      onPress={() => setDuree(d)}
                    >
                      <Text style={[styles.dureeBtnText, duree === d && styles.dureeBtnTextActive]}>
                        {d} jour{d > 1 ? "s" : ""}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <TextInput
              style={styles.input}
              placeholder="Partage ton écho..."
              value={text}
              onChangeText={setText}
              multiline
              maxLength={280}
            />

            <View style={styles.formActions}>
              <TouchableOpacity onPress={() => setShowFormExpanded(false)}>
                <Text style={styles.cancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.publishBtn, loading && styles.publishBtnDisabled]}
                onPress={handlePublish}
                disabled={loading}
              >
                <Text style={styles.publishBtnText}>{loading ? "..." : "Publier 🌊"}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Feed */}
      <FlatList
        data={echos}
        keyExtractor={(item) => item.id}
        style={styles.list}
        renderItem={({ item }) => {
          const restantes = item.type === "ouvert" && item.cercle
            ? item.cercle - item.participants.length : null;
          const dejaParticipant = auth.currentUser
            ? item.participants.includes(auth.currentUser.uid) : false;
          const peutRepondre = canReply(item);
          const estAuteur = auth.currentUser?.uid === item.authorId;
          const ferme = isClosed(item);
          const tempsRestant = getTimeRemaining(item);
          const reps = echoReps[item.id] ?? [];
          const showAll = showAllReps[item.id] ?? false;
          const visibleReps = showAll ? reps : reps.slice(0, MAX_VISIBLE_REPS);

          return (
            <View style={styles.echoCard}>
              <View style={styles.echoTopRow}>
                <Text style={styles.echoPseudo}>{item.authorPseudo}</Text>
                <View style={styles.echoTopRight}>
                  {item.type === "ouvert" && (
                    <View style={[styles.typeBadge, ferme && styles.typeBadgeClosed]}>
                      <Text style={[styles.typeBadgeText, ferme && styles.typeBadgeTextClosed]}>
                        {ferme ? "🔒 Fermé" : "🤝 Ouvert"}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.echoEmotion}>{item.emotion}</Text>
                </View>
              </View>

              <Text style={styles.echoText}>{item.text}</Text>

              {/* Infos cercle */}
              {item.type === "ouvert" && (
                <View style={styles.cercleInfoRow}>
                  {!ferme && restantes !== null && (
                    <Text style={[styles.placesText, restantes === 0 && !dejaParticipant && styles.placesTextFull]}>
                      {dejaParticipant ? "✅ Tu participes" : restantes === 0 ? "🔒 Complet" : `🪑 ${restantes}/${item.cercle}`}
                    </Text>
                  )}
                  {tempsRestant ? (
                    <Text style={[styles.tempsText, ferme && styles.tempsTextClosed]}>{tempsRestant}</Text>
                  ) : null}
                </View>
              )}

              {/* Boutons auteur */}
              {estAuteur && item.type === "ouvert" && (
                <View style={styles.auteurActions}>
                  {!ferme ? (
                    <TouchableOpacity style={styles.closeBtn} onPress={() => handleCloseCercle(item)}>
                      <Text style={styles.closeBtnText}>🔒 Fermer le cercle</Text>
                    </TouchableOpacity>
                  ) : item.reouvertures < MAX_REOUVERTURES ? (
                    <TouchableOpacity style={styles.reopenBtn} onPress={() => handleReouvrir(item)}>
                      <Text style={styles.reopenBtnText}>
                        🔄 Rouvrir ({MAX_REOUVERTURES - item.reouvertures} restante{MAX_REOUVERTURES - item.reouvertures > 1 ? "s" : ""})
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.maxReouverturesText}>Réouvertures épuisées</Text>
                  )}
                </View>
              )}

              {/* Réactions */}
              <View style={styles.reactionsRow}>
                <TouchableOpacity style={styles.reactionBtn} onPress={() => handleReaction(item.id, "heart")}>
                  <Text>❤️</Text><Text style={styles.reactionCount}>{item.reactions.heart}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.reactionBtn} onPress={() => handleReaction(item.id, "broken")}>
                  <Text>💔</Text><Text style={styles.reactionCount}>{item.reactions.broken}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.reactionBtn} onPress={() => handleReaction(item.id, "jar")}>
                  <Text>🫙</Text><Text style={styles.reactionCount}>{item.reactions.jar}</Text>
                </TouchableOpacity>
              </View>

              {/* EchoReps */}
              {item.type === "ouvert" && (
                <View style={styles.repSection}>
                  {visibleReps.map((rep) => (
                    <View key={rep.id} style={styles.repCard}>
                      <Text style={styles.repPseudo}>{rep.authorPseudo}</Text>
                      <Text style={styles.repText}>{rep.text}</Text>
                    </View>
                  ))}

                  {reps.length > MAX_VISIBLE_REPS && (
                    <TouchableOpacity onPress={() => setShowAllReps((prev) => ({ ...prev, [item.id]: !showAll }))}>
                      <Text style={styles.seeMoreText}>
                        {showAll ? "▲ Voir moins" : `▼ Voir les ${reps.length - MAX_VISIBLE_REPS} autres EchoRep`}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {reps.length === 0 && (
                    <Text style={styles.repEmptyText}>
                      {ferme ? "Aucun EchoRep reçu." : "Aucun EchoRep pour l'instant 🌿"}
                    </Text>
                  )}

                  {peutRepondre && (
                    <>
                      <View style={styles.suggestionsRow}>
                        {SUGGESTIONS.map((s) => (
                          <TouchableOpacity key={s} style={styles.suggestionBtn} onPress={() => handleSuggestion(item, s)}>
                            <Text style={styles.suggestionText}>{s}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <View style={styles.repInputRow}>
                        <TextInput
                          style={styles.repInput}
                          placeholder="Écris ton EchoRep..."
                          value={repText[item.id] ?? ""}
                          onChangeText={(t) => setRepText((prev) => ({ ...prev, [item.id]: t }))}
                          multiline
                          maxLength={200}
                        />
                        <TouchableOpacity
                          style={[styles.repSendBtn, repLoading && styles.publishBtnDisabled]}
                          onPress={() => handleSendRep(item)}
                          disabled={repLoading}
                        >
                          <Text style={styles.repSendText}>↑</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Aucun écho pour l'instant. Sois le premier à partager 🌊</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", paddingTop: 50, paddingHorizontal: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  logo: { fontSize: 24, fontWeight: "bold", color: "#0F766E" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  greeting: { fontSize: 13, color: "#0F766E", fontWeight: "600" },
  logoutText: { color: "#94A3B8", fontSize: 13 },
  wellBox: { backgroundColor: "#0F766E", borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 12 },
  wellEmoji: { fontSize: 28 },
  wellCount: { fontSize: 16, fontWeight: "bold", color: "white" },
  wellLabel: { fontSize: 12, color: "#99D6CF" },
  publishBox: { backgroundColor: "white", borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: "#E2E8F0" },
  publishClosed: { paddingVertical: 6 },
  publishClosedText: { color: "#94A3B8", fontSize: 14 },
  formRow: { flexDirection: "row", gap: 8, marginBottom: 10, alignItems: "center" },
  emotionRow: { flexDirection: "row", gap: 6 },
  emotionBtn: { padding: 8, borderRadius: 20, borderWidth: 1, borderColor: "#CBD5E1" },
  emotionActive: { backgroundColor: "#0F766E", borderColor: "#0F766E" },
  typeRow: { flex: 1, flexDirection: "row", gap: 6 },
  typeBtn: { flex: 1, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 8, paddingVertical: 7, alignItems: "center" },
  typeBtnActive: { backgroundColor: "#0F766E", borderColor: "#0F766E" },
  typeBtnText: { fontSize: 13, fontWeight: "600", color: "#475569" },
  typeBtnTextActive: { color: "white" },
  cercleRow: { flexDirection: "row", gap: 6, marginBottom: 8 },
  cercleBtn: { flex: 1, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 8, padding: 8, alignItems: "center", flexDirection: "row", gap: 4, justifyContent: "center" },
  cercleBtnActive: { backgroundColor: "#0F766E", borderColor: "#0F766E" },
  cercleBtnText: { fontSize: 12, fontWeight: "600", color: "#475569" },
  cercleBtnTextActive: { color: "white" },
  dureeRow: { flexDirection: "row", gap: 6, marginBottom: 10 },
  dureeBtn: { flex: 1, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 8, paddingVertical: 7, alignItems: "center" },
  dureeBtnActive: { backgroundColor: "#0F766E", borderColor: "#0F766E" },
  dureeBtnText: { fontSize: 12, fontWeight: "600", color: "#475569" },
  dureeBtnTextActive: { color: "white" },
  input: { minHeight: 70, fontSize: 15, color: "#1E293B", textAlignVertical: "top", marginBottom: 10, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 8, padding: 10 },
  formActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cancelText: { color: "#94A3B8", fontSize: 14 },
  publishBtn: { backgroundColor: "#0F766E", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  publishBtnDisabled: { backgroundColor: "#94A3B8" },
  publishBtnText: { color: "white", fontWeight: "600", fontSize: 14 },
  list: { flex: 1 },
  echoCard: { backgroundColor: "white", borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#E2E8F0" },
  echoTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  echoTopRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  echoPseudo: { fontWeight: "600", color: "#0F766E", fontSize: 13 },
  echoEmotion: { fontSize: 16 },
  typeBadge: { backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0", borderRadius: 20, paddingVertical: 2, paddingHorizontal: 7 },
  typeBadgeClosed: { backgroundColor: "#F1F5F9", borderColor: "#CBD5E1" },
  typeBadgeText: { fontSize: 11, color: "#166534", fontWeight: "600" },
  typeBadgeTextClosed: { color: "#64748B" },
  echoText: { fontSize: 15, color: "#1E293B", lineHeight: 22, marginBottom: 8 },
  cercleInfoRow: { flexDirection: "row", gap: 12, alignItems: "center", marginBottom: 8 },
  placesText: { fontSize: 12, color: "#0F766E", fontWeight: "500" },
  placesTextFull: { color: "#94A3B8" },
  tempsText: { fontSize: 12, color: "#64748B" },
  tempsTextClosed: { color: "#94A3B8" },
  auteurActions: { marginBottom: 10 },
  closeBtn: { backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, alignSelf: "flex-start" },
  closeBtnText: { fontSize: 12, color: "#DC2626", fontWeight: "600" },
  reopenBtn: { backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, alignSelf: "flex-start" },
  reopenBtnText: { fontSize: 12, color: "#166534", fontWeight: "600" },
  maxReouverturesText: { fontSize: 12, color: "#94A3B8" },
  reactionsRow: { flexDirection: "row", gap: 14, alignItems: "center", marginBottom: 10 },
  reactionBtn: { flexDirection: "row", alignItems: "center", gap: 3 },
  reactionCount: { fontSize: 13, color: "#64748B", fontWeight: "600" },
  repSection: { borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 10 },
  repCard: { backgroundColor: "#F8FAFC", borderRadius: 10, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: "#E2E8F0" },
  repPseudo: { fontWeight: "600", color: "#0F766E", fontSize: 12, marginBottom: 3 },
  repText: { fontSize: 13, color: "#1E293B", lineHeight: 18 },
  repEmptyText: { textAlign: "center", color: "#94A3B8", fontSize: 13, marginBottom: 10 },
  seeMoreText: { color: "#0F766E", fontSize: 13, fontWeight: "600", textAlign: "center", marginBottom: 10 },
  suggestionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10, marginTop: 6 },
  suggestionBtn: { backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0", borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10 },
  suggestionText: { fontSize: 12, color: "#166534" },
  repInputRow: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
  repInput: { flex: 1, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 10, padding: 10, fontSize: 14, minHeight: 44, textAlignVertical: "top" },
  repSendBtn: { backgroundColor: "#0F766E", width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  repSendText: { color: "white", fontWeight: "bold", fontSize: 18 },
  emptyText: { textAlign: "center", color: "#94A3B8", fontSize: 15, marginTop: 40 },
});