import { useState, useEffect, useCallback } from "react";
import { Modal, View, Text, TextInput, StyleSheet } from "react-native";
import {
  useAddIngredientMutation,
  useAddProductMutation,
} from "../../services/queries/inventory";
import { ToastSuccess } from "../../utils/toast";
import Button from "../button";
import { useInventoryStore } from "../../store/inventory.store";
import { formatIDR } from "../../utils/format";
import { useQueryClient } from "@tanstack/react-query";
import { handleError } from "../../utils/error";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function AddProductModal({ visible, onClose }: Props) {
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [uom, setUom] = useState("");
  const [icon, setIcon] = useState("");

  const { mutate, isPending } = useAddProductMutation();

  const handleOnReset = useCallback(() => {
    setName("");
    setUom("");
    setIcon("");
    onClose();
  }, []);

  const handleOnSubmit = () => {
    const payload = {
      name,
      uom,
      icon,
    };

    mutate(payload, {
      onSuccess: ({ message }) => {
        queryClient.invalidateQueries({ queryKey: ["product:all"] });
        handleOnReset();
        ToastSuccess(message);
      },
      onError: (e) => {
        handleOnReset();
        handleError(e);
      },
    });
  };

  return (
    <Modal
      key={"add-product-modal"}
      visible={visible}
      animationType="slide"
      transparent
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Add Product</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="..."
            placeholderTextColor="#64748B"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Uom</Text>
          <TextInput
            style={styles.input}
            placeholder="..."
            placeholderTextColor="#64748B"
            value={uom}
            onChangeText={setUom}
            autoCapitalize="none"
          />

          <Text style={styles.label}>icon</Text>
          <TextInput
            style={styles.input}
            placeholder="..."
            placeholderTextColor="#64748B"
            value={icon}
            onChangeText={setIcon}
          />

          <View style={styles.modalActions}>
            <Button
              style={{ backgroundColor: "#b34219" }}
              textStyle={{ fontSize: 12 }}
              text="Batal"
              key="batal"
              onPress={handleOnReset}
            />
            <Button
              textStyle={{ fontSize: 12 }}
              text="Simpan"
              key="simpan"
              onPress={handleOnSubmit}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function AddProductModalBtn() {
  const { toggleAddProductModal } = useInventoryStore();
  return (
    <Button
      textStyle={{ fontSize: 12 }}
      text="+ Product"
      onPress={toggleAddProductModal}
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
