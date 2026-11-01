import { useMutation, useQuery } from "@tanstack/react-query";
import {
  addProduct,
  editStockProduct,
  getProduct,
  updateStockProduct,
} from "../../api/inventory";
import { handleError } from "../../../utils/error";

// x
export const useProductQuery = (
  type: "Semua" | "Aman" | "Menipis",
  search: string,
) => {
  return useQuery({
    queryKey: ["inventory:product", type, search],
    queryFn: () => getProduct(type, search),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useProductMutation = () => {
  return useMutation({
    mutationFn: addProduct,
    onError: handleError,
  });
};

export const useUpdateStockMutation = () => {
  return useMutation({
    mutationFn: updateStockProduct,
    onError: handleError,
  });
};

export const useEditStockMutation = () => {
  return useMutation({
    mutationFn: editStockProduct,
    onError: handleError,
  });
};
