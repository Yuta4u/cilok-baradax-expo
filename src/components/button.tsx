import { StyleSheet, Text, TouchableOpacity } from "react-native";

interface Props {
  text: string;
  key?: string;
  style?: any;
  textStyle?: any;
  onPress: (value?: any) => void;
}

export default function Button({
  text,
  key,
  style,
  textStyle,
  onPress,
}: Props) {
  return (
    <TouchableOpacity
      key={key}
      style={[styles.button, style]}
      onPress={() => onPress()}
    >
      <Text style={[styles.buttonText, textStyle]}>{text}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#C75D2C",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
