import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import * as api from "../services/api";
import { useUserLocation } from "../services/location";
import { colors, shadow } from "../constants/theme";
import { DietPreferenceIcon } from "../components/DietPreferenceIcon";
import { DietPreferenceModal } from "../components/DietPreferenceModal";

const CARD_GAP = 10;
const CARD_COLUMNS = 3;
const SCREEN_PADDING = 20;
const CARD_WIDTH =
  (Dimensions.get("window").width - SCREEN_PADDING * 2 - CARD_GAP * (CARD_COLUMNS - 1)) /
  CARD_COLUMNS;

function formatDistance(km?: number | null): string {
  if (km == null) return "";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export default function HomeScreen() {
  const router = useRouter();
  const { location } = useUserLocation();
  const [query, setQuery] = useState("");
  const [restaurants, setRestaurants] = useState<api.Restaurant[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [prefsOpen, setPrefsOpen] = useState(false);

  useEffect(() => {
    void loadRestaurants("");
  }, [location]);

  async function loadRestaurants(q: string) {
    setLoadError(null);
    try {
      const data = await api.fetchRestaurants(
        q.trim() || undefined,
        location?.latitude,
        location?.longitude,
      );
      setRestaurants(data.results || []);
    } catch (e) {
      setRestaurants([]);
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  }

  function onSearchChange(text: string) {
    setQuery(text);
    void loadRestaurants(text);
  }

  function openRestaurant(r: api.Restaurant) {
    router.push({
      pathname: "/loading",
      params: { restaurantId: String(r.id), restaurantName: r.name },
    });
  }

  const nearby = query.trim() ? restaurants : restaurants.slice(0, 6);

  return (
    <>
      <Stack.Screen
        options={{
          title: "Главная",
          headerRight: () => (
            <Pressable
              onPress={() => setPrefsOpen(true)}
              hitSlop={12}
              style={styles.headerIconBtn}
              accessibilityLabel="Diet preferences"
            >
              <DietPreferenceIcon />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.screenContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Что хочешь поесть?</Text>

        <TextInput
          style={styles.input}
          value={query}
          onChangeText={onSearchChange}
          placeholder="Поиск ресторанов"
          placeholderTextColor={colors.muted}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearby Restaurants</Text>
          {!query.trim() && restaurants.length > 6 && (
            <Pressable onPress={() => router.push("/restaurants")}>
              <Text style={styles.seeAll}>See all &gt;</Text>
            </Pressable>
          )}
        </View>

        {restaurants.length === 0 ? (
          <Text style={styles.empty}>
            {loadError
              ? `Network error: ${loadError}`
              : query.trim()
                ? "Nothing found. Try a different name."
                : "No restaurants. Check that the backend is running."}
          </Text>
        ) : (
          <View style={styles.grid}>
            {nearby.map((r) => (
              <Pressable
                key={r.id}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => openRestaurant(r)}
              >
                <Text style={styles.cardEmoji}>{r.emoji || "🍽️"}</Text>
                <Text style={styles.cardName} numberOfLines={1}>
                  {r.name}
                </Text>
                {r.distance_km != null && (
                  <Text style={styles.cardDistance}>
                    📍 {formatDistance(r.distance_km)}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <DietPreferenceModal visible={prefsOpen} onClose={() => setPrefsOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  screenContent: { padding: SCREEN_PADDING, paddingBottom: 40 },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "800",
    marginTop: 4,
    marginBottom: 16,
  },
  input: {
    backgroundColor: colors.inputBg,
    color: colors.text,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
    ...shadow.soft,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 18,
  },
  seeAll: {
    color: colors.accent,
    fontWeight: "700",
    fontSize: 14,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    ...shadow.card,
  },
  cardPressed: { opacity: 0.9 },
  cardEmoji: { fontSize: 32, marginBottom: 8 },
  cardName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  cardDistance: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "500",
  },
  empty: {
    color: colors.muted,
    textAlign: "center",
    padding: 24,
    fontSize: 14,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
  },
});
