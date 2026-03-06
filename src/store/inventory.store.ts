import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface InventoryState {
  addIngredientModal: boolean;
  addProductModal: boolean;
  addStockModal: boolean;
  stockInProductModal: boolean;
  stockInProductId: string;
  stockOutProductModal: boolean;
  stockOutProductId: string;
  addStockId: string;
  subtractStockModal: boolean;
  subtractStockId: string;
  editMinimalStockModal: boolean;
  editMinimalStockId: string;
  toggleAddIngredientModal: () => void;
  toggleAddProductModal: () => void;
  toggleAddStockModal: (id?: string) => void;
  toggleSubtractStockModal: (id?: string) => void;
  toggleEditMinimalStockModal: (id?: string) => void;
  toggleStockInProductModal: (id?: string) => void;
  toggleStockOutProductModal: (id?: string) => void;
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      addIngredientModal: false,
      addProductModal: false,
      addStockModal: false,
      subtractStockModal: false,
      editMinimalStockModal: false,
      stockInProductModal: false,
      stockInProductId: "",
      stockOutProductModal: false,
      stockOutProductId: "",
      addStockId: "",
      subtractStockId: "",
      editMinimalStockId: "",
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
      toggleEditMinimalStockModal: (id?: string) =>
        set({
          editMinimalStockModal: !get().editMinimalStockModal,
          editMinimalStockId: id,
        }),
      toggleStockInProductModal: (id?: string) =>
        set({
          stockInProductModal: !get().stockInProductModal,
          stockInProductId: id,
        }),
      toggleStockOutProductModal: (id?: string) =>
        set({
          stockOutProductModal: !get().stockOutProductModal,
          stockOutProductId: id,
        }),
    }),
    {
      name: "store:inventory",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
