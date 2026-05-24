import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface StockManagementState {
  addStockId: string;
  addStockModal: boolean;
  addStockCilokModal: boolean;
  addStockCilokModalData: User | null;
  setAddStockId: (id: string) => void;
  toggleAddStockCilokModal: (data?: User) => void;
  toggleAddStockModal: () => void;
}

export const useStockManagementStore = create<StockManagementState>()(
  persist(
    (set, get) => ({
      addStockId: "",
      addStockModal: false,
      addStockCilokModal: false,
      addStockCilokModalData: null,
      setAddStockId: (id: string) => set({ addStockId: id }),
      toggleAddStockCilokModal: (data) =>
        set({
          addStockCilokModal: !get().addStockCilokModal,
          addStockCilokModalData: data,
        }),
      toggleAddStockModal: () => set({ addStockModal: !get().addStockModal }),
    }),
    {
      name: "store:stock-management",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
