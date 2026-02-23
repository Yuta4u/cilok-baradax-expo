import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Slot } from "expo-router";
import Toast from "react-native-toast-message";
import { toastConfig } from "../lib/toastConfig";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Slot />
      <Toast config={toastConfig} />
    </QueryClientProvider>
  );
}
