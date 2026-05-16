import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, shadow } from "../constants/theme";

interface Props {
  dishName: string;
  calories?: number;
  protein?: number;
  onPress: () => void;
}

export function DishListRow({ dishName, calories, protein, onPress }: Props) {
  const meta =
    calories != null || protein != null
      ? [calories != null ? `${Math.round(calories)} ккал` : null, protein != null ? `Б ${protein} г` : null]
          .filter(Boolean)
          .join(" · ")
      : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.textBlock}>
        <Text style={styles.name} numberOfLines={2}>
          {dishName}
        </Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
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
  rowPressed: { opacity: 0.88 },
  textBlock: { flex: 1, paddingRight: 8 },
  name: { fontSize: 16, fontWeight: "600", color: colors.text },
  meta: { marginTop: 4, fontSize: 13, color: colors.calorie, fontWeight: "600" },
  chevron: { fontSize: 24, fontWeight: "300", color: colors.muted, marginTop: -4 },
});
