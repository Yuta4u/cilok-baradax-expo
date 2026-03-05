import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AddIngredientApi,
  AddProductApi,
  getAllIngredientApi,
  getAllProductApi,
  updateStockIngredientApi,
} from "../../api/inventory";
import { handleError } from "../../../utils/error";

export const useGetAllIngredientQuery = (q: string) => {
  return useQuery({
    queryKey: ["ingredient:all"],
    queryFn: () => getAllIngredientApi(q),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useGetAllProducttQuery = (q: string) => {
  return useQuery({
    queryKey: ["product:all"],
    queryFn: () => getAllProductApi(q),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useAddIngredientMutation = () => {
  return useMutation({
    mutationFn: AddIngredientApi,
    onError: handleError,
  });
};

export const useAddProductMutation = () => {
  return useMutation({
    mutationFn: AddProductApi,
    onError: handleError,
  });
};

export const useUpdateStockIngredientMutation = () => {
  return useMutation({
    mutationFn: updateStockIngredientApi,
    onError: handleError,
  });
};
