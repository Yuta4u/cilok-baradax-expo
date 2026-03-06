import { useState, useCallback } from "react";
import { Modal, View, Text, TextInput, StyleSheet } from "react-native";
import Button from "../button";
import { useInventoryStore } from "../../store/inventory.store";
import { useUpdateStockIngredientMutation } from "../../services/queries/inventory";
import { ToastSuccess } from "../../utils/toast";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function AddStockModal({ visible, onClose }: Props) {
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState("");

  const { addStockId: id } = useInventoryStore();

  const { mutate, isPending } = useUpdateStockIngredientMutation();

  const handleOnReset = useCallback(() => {
    setQuantity("");
    onClose();
  }, []);

  const handleOnSubmit = () => {
    const payload = {
      id,
      type: 1,
      quantity: Number(quantity),
    };

    mutate(payload, {
      onSuccess: ({ message }) => {
        ToastSuccess(message);
        handleOnReset();
        queryClient.invalidateQueries({ queryKey: ["ingredient:all"] });
      },
    });
  };

  return (
    <Modal
      key={"add-stock-modal"}
      visible={visible}
      animationType="slide"
      transparent
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Stock In</Text>

          <Text style={styles.label}>Quantity</Text>
          <TextInput
            style={styles.input}
            placeholder="..."
            placeholderTextColor="#64748B"
            value={quantity}
            onChangeText={setQuantity}
          />

          <View style={styles.modalActions}>
            <Button
              style={{ backgroundColor: "#b34219" }}
              textStyle={{ fontSize: 12 }}
              text="Batal"
              onPress={handleOnReset}
              loading={isPending}
            />
            <Button
              textStyle={{ fontSize: 12 }}
              text="Simpan"
              onPress={handleOnSubmit}
              loading={isPending}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function AddStockModalBtn({ id }: { id: string }) {
  const { toggleAddStockModal } = useInventoryStore();
  return (
    <Button
      textStyle={{ fontSize: 14 }}
      text="+ Stock In"
      onPress={() => toggleAddStockModal(id)}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#e9b190",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 20,
    color: "#fff",
  },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6, color: "#fff" },
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 14,
    borderWidth: 1,
    backgroundColor: "#fff2de",
    borderColor: "#3341553a",
  },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#334155",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  cancelBtnText: { fontWeight: "700", color: "#fff" },
  saveBtn: {
    flex: 1,
    backgroundColor: "#D96F32",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  saveBtnText: {
    fontWeight: "700",
    color: "#fff",
  },
});
