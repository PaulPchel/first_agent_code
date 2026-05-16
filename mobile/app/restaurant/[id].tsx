import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker } from "react-native-maps";
import { colors, shadow } from "../../constants/theme";
import * as api from "../../services/api";
import { useUserLocation } from "../../services/location";
import { DishMenuCard } from "../../components/DishMenuCard";
import {
  DEFAULT_DIET_PREFERENCE,
  type DietPreference,
  loadDietPreferences,
  scoreDishForPreferences,
} from "../../services/dietPreferences";

const MAP_HEIGHT = 180;

function sumMacros(items: api.Dish[]) {
  return items.reduce(
    (acc, d) => ({
      calories: acc.calories + (d.calories ?? 0),
      protein: acc.protein + (d.protein ?? 0),
      fat: acc.fat + (d.fat ?? 0),
      carbs: acc.carbs + (d.carbs ?? 0),
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );
}

function fmtNutrient(n: number): string {
  return Number.isFinite(n) ? `${Math.round(n)}` : "—";
}

function formatDistance(km?: number | null): string {
  if (km == null) return "";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export default function RestaurantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { location } = useUserLocation();
  const { id, name } = useLocalSearchParams<{ id?: string; name?: string }>();
  const restaurantId = Number(id);
  const title = name ? String(name) : "Ресторан";

  const [restaurant, setRestaurant] = useState<api.Restaurant | null>(null);
  const [dishes, setDishes] = useState<api.Dish[]>([]);
  const [activeTab, setActiveTab] = useState<"best" | "all">("best");
  const [menuQuery, setMenuQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [macrosOpen, setMacrosOpen] = useState(false);
  const [prefs, setPrefs] = useState<DietPreference>(DEFAULT_DIET_PREFERENCE);

  useFocusEffect(
    useCallback(() => {
      void loadDietPreferences().then(setPrefs);
    }, [])
  );

  useEffect(() => {
    if (!restaurantId) return;
    void loadDishes();
    void loadRestaurant();
  }, [restaurantId, location]);

  const loadDishes = useCallback(async () => {
    try {
      const data = await api.fetchDishes(restaurantId);
      setDishes(data.results || []);
    } catch {
      setDishes([]);
    }
  }, [restaurantId]);

  const loadRestaurant = useCallback(async () => {
    try {
      const data = await api.fetchRestaurant(
        restaurantId,
        location?.latitude,
        location?.longitude,
      );
      setRestaurant(data);
    } catch {
      /* use route-param title as fallback */
    }
  }, [restaurantId, location]);

  const bestForMe = useMemo(() => {
    return [...dishes]
      .sort(
        (a, b) =>
          scoreDishForPreferences(b, prefs) - scoreDishForPreferences(a, prefs)
      )
      .slice(0, 10);
  }, [dishes, prefs]);

  const tabList = activeTab === "best" ? bestForMe : dishes;

  const filtered = useMemo(() => {
    const q = menuQuery.trim().toLowerCase();
    if (!q) return tabList;
    return tabList.filter((d) => d.dish_name.toLowerCase().includes(q));
  }, [tabList, menuQuery]);

  const selectedDishes = useMemo(() => {
    const setSel = new Set(selectedIds);
    return dishes.filter((d) => setSel.has(d.id));
  }, [dishes, selectedIds]);

  const totals = useMemo(() => sumMacros(selectedDishes), [selectedDishes]);

  function toggleId(dishId: number) {
    setSelectedIds((prev) =>
      prev.includes(dishId) ? prev.filter((x) => x !== dishId) : [...prev, dishId]
    );
  }

  function openDish(d: api.Dish) {
    router.push({
      pathname: "/restaurant/[id]/dish/[dishId]",
      params: {
        id: String(restaurantId),
        dishId: String(d.id),
        restaurantName: title,
      },
    });
  }

  const showMacrosBar = selectedIds.length >= 2;
  const footerPad = showMacrosBar ? 72 + insets.bottom : 16 + insets.bottom;

  const hasCoords = restaurant?.latitude != null && restaurant?.longitude != null;

  return (
    <>
      <Stack.Screen options={{ title }} />
      <View style={styles.screen}>
        {hasCoords && (
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: restaurant!.latitude!,
                longitude: restaurant!.longitude!,
                latitudeDelta: 0.008,
                longitudeDelta: 0.008,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              {...(Platform.OS === "android" ? { liteMode: true } : {})}
            >
              <Marker
                coordinate={{
                  latitude: restaurant!.latitude!,
                  longitude: restaurant!.longitude!,
                }}
                title={restaurant!.name}
              />
            </MapView>
          </View>
        )}

        <View style={styles.infoRow}>
          <Text style={styles.header}>{restaurant?.name ?? title}</Text>
          <View style={styles.badges}>
            {restaurant?.distance_km != null && (
              <Text style={styles.badge}>📍 {formatDistance(restaurant.distance_km)}</Text>
            )}
            {restaurant?.rating != null && (
              <Text style={styles.badge}>⭐ {restaurant.rating.toFixed(1)}</Text>
            )}
          </View>
        </View>

        <Text style={styles.sub}>
          MENU · CHOOSE YOUR MEALS
        </Text>

        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, activeTab === "best" && styles.tabActive]}
            onPress={() => setActiveTab("best")}
          >
            <Text style={[styles.tabText, activeTab === "best" && styles.tabTextActive]}>
              ✦ Best for you
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === "all" && styles.tabActive]}
            onPress={() => setActiveTab("all")}
          >
            <Text style={[styles.tabText, activeTab === "all" && styles.tabTextActive]}>
              All dishes
            </Text>
          </Pressable>
        </View>

        <TextInput
          style={styles.search}
          value={menuQuery}
          onChangeText={setMenuQuery}
          placeholder="Search dishes…"
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          onSubmitEditing={Keyboard.dismiss}
        />

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.list, { paddingBottom: footerPad }]}
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 ? (
            <Text style={styles.empty}>
              {menuQuery.trim()
                ? "Nothing found. Try a different query."
                : "No dishes in this section."}
            </Text>
          ) : (
            filtered.map((d) => (
              <DishMenuCard
                key={d.id}
                dishName={d.dish_name}
                calories={d.calories}
                selected={selectedIds.includes(d.id)}
                onToggleSelect={() => toggleId(d.id)}
                onOpenDetail={() => openDish(d)}
              />
            ))
          )}
        </ScrollView>

        {showMacrosBar ? (
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <Pressable style={styles.macroBtn} onPress={() => setMacrosOpen(true)}>
              <Text style={styles.macroBtnIcon}>✦</Text>
              <Text style={styles.macroBtnText}>Total macros</Text>
            </Pressable>
          </View>
        ) : null}

        <Modal
          visible={macrosOpen}
          animationType="fade"
          transparent
          onRequestClose={() => setMacrosOpen(false)}
        >
          <TouchableWithoutFeedback onPress={() => setMacrosOpen(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>
          <View style={styles.modalCenter}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Selection total</Text>
                <Pressable onPress={() => setMacrosOpen(false)} hitSlop={12}>
                  <Text style={styles.modalClose}>✕</Text>
                </Pressable>
              </View>
              <Text style={styles.modalRestaurant}>{restaurant?.name ?? title}</Text>
              <Text style={styles.modalSubtitle} numberOfLines={4}>
                {selectedDishes.map((d) => d.dish_name).join(" · ")}
              </Text>

              <View style={styles.macroGrid}>
                <MacroCell label="Kcal" value={`${fmtNutrient(totals.calories)}`} unit="" />
                <MacroCell label="Protein" value={fmtNutrient(totals.protein)} unit="g" />
                <MacroCell label="Fat" value={fmtNutrient(totals.fat)} unit="g" />
                <MacroCell label="Carbs" value={fmtNutrient(totals.carbs)} unit="g" />
              </View>

              <Pressable style={styles.modalDone} onPress={() => setMacrosOpen(false)}>
                <Text style={styles.modalDoneText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

function MacroCell({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <View style={styles.macroCell}>
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroValue}>
        {value}
        {unit ? <Text style={styles.macroUnit}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  mapContainer: {
    height: MAP_HEIGHT,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: "hidden",
  },
  map: { flex: 1 },
  infoRow: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  header: { color: colors.text, fontSize: 24, fontWeight: "800" },
  badges: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
  },
  badge: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  sub: {
    color: colors.muted,
    marginTop: 16,
    marginBottom: 10,
    paddingHorizontal: 16,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  tabs: { flexDirection: "row", gap: 8, marginBottom: 12, paddingHorizontal: 16 },
  tab: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    paddingVertical: 12,
    ...shadow.soft,
  },
  tabActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  tabText: { color: colors.textSecondary, fontWeight: "600", fontSize: 14 },
  tabTextActive: { color: colors.accentMuted, fontWeight: "700" },
  search: {
    backgroundColor: colors.inputBg,
    color: colors.text,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },
  list: { paddingTop: 4, paddingHorizontal: 16 },
  empty: { color: colors.muted, textAlign: "center", marginTop: 36, paddingHorizontal: 12 },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  macroBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingVertical: 15,
    ...shadow.soft,
  },
  macroBtnIcon: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  macroBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  modalCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: colors.modalSurface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    ...shadow.card,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  modalClose: { color: colors.muted, fontSize: 20, padding: 4 },
  modalRestaurant: {
    color: colors.accentMuted,
    fontWeight: "700",
    marginTop: 10,
    fontSize: 15,
  },
  modalSubtitle: { color: colors.textSecondary, marginTop: 6, fontSize: 13, lineHeight: 18 },
  macroGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 18,
    gap: 10,
  },
  macroCell: {
    width: "47%",
    backgroundColor: colors.surface2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  macroLabel: { color: colors.muted, fontSize: 12, fontWeight: "600", marginBottom: 4 },
  macroValue: { color: colors.text, fontSize: 22, fontWeight: "800" },
  macroUnit: { fontSize: 15, fontWeight: "700", color: colors.muted },
  modalDone: {
    marginTop: 18,
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalDoneText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
});
