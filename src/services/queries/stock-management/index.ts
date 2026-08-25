import { useMutation, useQuery } from "@tanstack/react-query";
import {
  addCashFlow,
  getCabang,
  getCabangToday,
  getCashFlowDetail,
  updateCashFlowItem,
  updateStockCilokApi,
} from "../../api/stock-management";
import { handleError } from "../../../utils/error";

export const useGetCabangQuery = () => {
  return useQuery({
    queryKey: ["cabang"],
    queryFn: getCabang,
    refetchOnMount: true,
    retryOnMount: true,
  });
};

export const useCabangTodayQuery = () => {
  return useQuery({
    queryKey: ["cabang:today"],
    queryFn: getCabangToday,
    refetchOnMount: true,
    retryOnMount: true,
  });
};

export const useUpdateStockCilokMutation = () => {
  return useMutation({
    mutationFn: updateStockCilokApi,
    onError: handleError,
  });
};

export const useCashFlowDetailMutation = () => {
  return useMutation({
    mutationFn: getCashFlowDetail,
    onError: handleError,
  });
};

export const useCashFlowMutation = () => {
  return useMutation({
    mutationFn: addCashFlow,
  });
};

export const useAddCashFlowMutation = () => {
  return useMutation({
    mutationFn: addCashFlow,
    onError: handleError,
  });
};

export const useUpdateCashFlowItemMutation = () => {
  return useMutation({
    mutationFn: updateCashFlowItem,
    onError: handleError,
  });
};
