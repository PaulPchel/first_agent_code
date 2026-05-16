import { View, StyleSheet } from "react-native";
import { colors } from "../constants/theme";

export function DietPreferenceIcon() {
  return (
    <View style={styles.wrap}>
      <View style={[styles.bar, { backgroundColor: colors.protein, width: "100%" }]} />
      <View style={[styles.bar, { backgroundColor: colors.carb, width: "72%" }]} />
      <View style={[styles.bar, { backgroundColor: colors.fat, width: "88%" }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  bar: {
    height: 4,
    borderRadius: 2,
    alignSelf: "stretch",
    maxWidth: "100%",
  },
});
