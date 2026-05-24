import { CSSProperties, JSX } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";

interface Props {
  text: string;
  loading?: boolean;
  icon?: JSX.Element;
  key?: string;
  disabled?: boolean;
  style?: CSSProperties;
  textStyle?: CSSProperties;
  onPress: (value?: any) => void;
}

export default function Button({
  text,
  icon,
  loading = false,
  style,
  disabled,
  textStyle,
  onPress,
}: Props) {
  return (
    <TouchableOpacity
      style={[styles.button, style as never]}
      onPress={() => onPress()}
      disabled={loading || disabled}
    >
      {loading ? (
        <ActivityIndicator color="#fff2de" size="small" />
      ) : (
        <Text style={[styles.buttonText, textStyle as never]}>
          {icon}
          {text}
        </Text>
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
