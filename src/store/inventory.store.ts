import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface InventoryState {
  addIngredientModal: boolean;
  addProductModal: boolean;
  addStockModal: boolean;
  subtractStockModal: boolean;
  addStockId: string;
  subtractStockId: string;
  toggleAddIngredientModal: () => void;
  toggleAddProductModal: () => void;
  toggleAddStockModal: (id?: string) => void;
  toggleSubtractStockModal: (id?: string) => void;
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      addIngredientModal: false,
      addProductModal: false,
      addStockModal: false,
      subtractStockModal: false,
      addStockId: "",
      subtractStockId: "",
      toggleAddIngredientModal: () =>
        set({ addIngredientModal: !get().addIngredientModal }),
      toggleAddProductModal: () =>
        set({ addProductModal: !get().addProductModal }),
      toggleAddStockModal: (id?: string) =>
        set({ addStockModal: !get().addStockModal, addStockId: id }),
      toggleSubtractStockModal: (id?: string) =>
        set({
          subtractStockModal: !get().subtractStockModal,
          subtractStockId: id,
        }),
    }),
    {
      name: "store:inventory",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
