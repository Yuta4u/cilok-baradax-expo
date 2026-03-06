import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface StockManagementState {
  addStockCilokModal: boolean;
  addStockCilokModalData: User | null;
  toggleAddStockCilokModal: (data?: User) => void;
}

export const useStockManagementStore = create<StockManagementState>()(
  persist(
    (set, get) => ({
      addStockCilokModal: false,
      addStockCilokModalData: null,
      toggleAddStockCilokModal: (data) =>
        set({
          addStockCilokModal: !get().addStockCilokModal,
          addStockCilokModalData: data,
        }),
    }),
    {
      name: "store:stock-management",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
