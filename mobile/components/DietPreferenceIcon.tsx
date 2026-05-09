import { View, StyleSheet } from "react-native";

export function DietPreferenceIcon() {
  return (
    <View style={styles.wrap}>
      <View style={[styles.bar, { backgroundColor: "#42a5f5", width: "100%" }]} />
      <View style={[styles.bar, { backgroundColor: "#ff9800", width: "72%" }]} />
      <View style={[styles.bar, { backgroundColor: "#66bb6a", width: "88%" }]} />
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
