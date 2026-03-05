import { CSSProperties } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";

interface Props {
  text: string;
  loading?: boolean;
  key?: string;
  style?: CSSProperties;
  textStyle?: CSSProperties;
  onPress: (value?: any) => void;
}

export default function Button({
  text,
  loading = false,
  style,
  textStyle,
  onPress,
}: Props) {
  return (
    <TouchableOpacity
      style={[styles.button, style as never]}
      onPress={() => onPress()}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#fff2de" size="small" />
      ) : (
        <Text style={[styles.buttonText, textStyle as never]}>{text}</Text>
      )}
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
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 8 },
});
