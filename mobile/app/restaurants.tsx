import { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as api from "../services/api";
import { useUserLocation } from "../services/location";
import { colors, shadow } from "../constants/theme";

function paramString(v: string | string[] | undefined): string {
  if (v == null) return "";
  return Array.isArray(v) ? (v[0] ?? "") : v;
}

function formatDistance(km?: number | null): string {
  if (km == null) return "";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export default function RestaurantsScreen() {
  const router = useRouter();
  const { location } = useUserLocation();
  const params = useLocalSearchParams<{ q?: string }>();

  const [query, setQuery] = useState(() => paramString(params.q));
  const [restaurants, setRestaurants] = useState<api.Restaurant[]>([]);

  const loadRestaurants = useCallback(
    async (q: string) => {
      try {
        const data = await api.fetchRestaurants(
          q.trim() || undefined,
          location?.latitude,
          location?.longitude,
        );
        setRestaurants(data.results || []);
      } catch {
        setRestaurants([]);
      }
    },
    [location],
  );

  useEffect(() => {
    const nextQ = paramString(params.q);
    setQuery(nextQ);
    void loadRestaurants(nextQ);
  }, [params.q, loadRestaurants]);

  useEffect(() => {
    void loadRestaurants(query);
  }, [location]);

  function onChangeQuery(text: string) {
    setQuery(text);
    void loadRestaurants(text.trim());
  }

  function openRestaurant(r: api.Restaurant) {
    router.push({
      pathname: "/loading",
      params: { restaurantId: String(r.id), restaurantName: r.name },
    });
  }

  return (
    <>
      <Stack.Screen options={{ title: "Nearby Restaurants" }} />
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={onChangeQuery}
          placeholder="Search restaurants..."
          placeholderTextColor={colors.muted}
        />

        {location && (
          <Text style={styles.locationHint}>📍 Showing restaurants near your location</Text>
        )}

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {restaurants.length === 0 ? (
            <Text style={styles.empty}>No restaurants found</Text>
          ) : (
            restaurants.map((r) => (
              <Pressable
                key={r.id}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => openRestaurant(r)}
              >
                <View style={styles.emojiContainer}>
                  <Text style={styles.emoji}>{r.emoji || "🍽️"}</Text>
                </View>

                <View style={styles.rowContent}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {r.name}
                  </Text>

                  <View style={styles.metaRow}>
                    {r.distance_km != null && (
                      <Text style={styles.meta}>📍 {formatDistance(r.distance_km)}</Text>
                    )}
                    {r.rating != null && (
                      <Text style={styles.meta}>⭐ {r.rating.toFixed(1)}</Text>
                    )}
                    {r.avg_calories != null && (
                      <Text style={styles.meta}>~{Math.round(r.avg_calories)} kcal avg</Text>
                    )}
                  </View>
                </View>

                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  input: {
    backgroundColor: colors.inputBg,
    color: colors.text,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },
  locationHint: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 12,
    paddingLeft: 4,
  },
  list: { flex: 1 },
  listContent: { gap: 10, paddingBottom: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    ...shadow.card,
  },
  rowPressed: { opacity: 0.92 },
  emojiContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  emoji: { fontSize: 24 },
  rowContent: { flex: 1 },
  rowName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "500",
  },
  chevron: { fontSize: 24, color: colors.muted, fontWeight: "300", marginLeft: 8 },
  empty: { color: colors.muted, textAlign: "center", padding: 24, fontSize: 14 },
});
