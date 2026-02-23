import React from "react";
import { View, Text } from "react-native";
import { BaseToast, ToastConfig } from "react-native-toast-message";

export const toastConfig: ToastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: "#b34219",
        backgroundColor: "#fff2de",
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontWeight: "600",
        color: "#b34219",
      }}
      text2Style={{
        fontSize: 14,
        color: "#b34219",
      }}
    />
  ),
  error: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: "#b34219",
        backgroundColor: "#fff2de",
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontWeight: "600",
        color: "#b34219",
      }}
      text2Style={{
        fontSize: 14,
        color: "#b34219",
      }}
    />
  ),
};
