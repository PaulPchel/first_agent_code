import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors } from "../constants/theme";

type Props = {
  dishName: string;
  calories?: number;
  selected: boolean;
  onToggleSelect: () => void;
  onOpenDetail: () => void;
};

export function DishMenuCard({
  dishName,
  calories,
  selected,
  onToggleSelect,
  onOpenDetail,
}: Props) {
  const calLabel =
    calories != null && Number.isFinite(calories)
      ? `${Math.round(calories)} ккал`
      : "— ккал";

  return (
    <View style={[styles.card, selected && styles.cardSelected]}>
      <Pressable
        onPress={onToggleSelect}
        style={({ pressed }) => [styles.checkHit, pressed && styles.pressed]}
        hitSlop={6}
      >
        <View style={[styles.checkbox, selected && styles.checkboxOn]}>
          {selected ? <Text style={styles.checkMark}>✓</Text> : null}
        </View>
      </Pressable>

      <Pressable
        onPress={onToggleSelect}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
      >
        <Text style={styles.name} numberOfLines={2}>
          {dishName}
        </Text>
        <View style={styles.calRow}>
          <Text style={styles.flame}>●</Text>
          <Text style={styles.calories}>{calLabel}</Text>
        </View>
      </Pressable>

      <Pressable
        onPress={onOpenDetail}
        style={({ pressed }) => [styles.chevHit, pressed && styles.pressed]}
        hitSlop={8}
      >
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  cardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  checkHit: { marginRight: 10 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  checkboxOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  checkMark: {
    color: "#000",
    fontSize: 13,
    fontWeight: "900",
    marginTop: -1,
  },
  main: { flex: 1, minWidth: 0 },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  calRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 4,
  },
  flame: {
    color: colors.calorie,
    fontSize: 10,
    marginTop: 1,
  },
  calories: {
    color: colors.calorie,
    fontSize: 15,
    fontWeight: "700",
  },
  chevHit: { paddingLeft: 6, paddingVertical: 4 },
  chevron: {
    fontSize: 26,
    fontWeight: "300",
    color: colors.accent,
  },
  pressed: { opacity: 0.75 },
});