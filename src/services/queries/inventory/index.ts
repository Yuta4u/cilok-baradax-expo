import { useMutation, useQuery } from "@tanstack/react-query";
import { addProduct, getProduct } from "../../api/inventory";
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
