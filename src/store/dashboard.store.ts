import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface DashboardState {
  reportModal: boolean;
  viewDetailModal: boolean;
  toggleReportModal: () => void;
  toggleViewDetailModal: () => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      reportModal: false,
      viewDetailModal: false,
      toggleReportModal: () => set({ reportModal: !get().reportModal }),
      toggleViewDetailModal: () =>
        set({ viewDetailModal: !get().viewDetailModal }),
    }),
    {
      name: "store:dashboard",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
