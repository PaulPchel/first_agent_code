import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, shadow } from "../constants/theme";

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
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    ...shadow.soft,
  },
  cardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  checkHit: { marginRight: 12 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  checkboxOn: {
    borderColor: colors.checkOn,
    backgroundColor: colors.checkOn,
  },
  checkMark: {
    color: "#FFFFFF",
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
  chevHit: { paddingLeft: 8, paddingVertical: 4 },
  chevron: {
    fontSize: 24,
    fontWeight: "300",
    color: colors.muted,
  },
  pressed: { opacity: 0.75 },
});
