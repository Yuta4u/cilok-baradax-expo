import { useMutation, useQuery } from "@tanstack/react-query";
import {
  addCashFlow,
  getCashFlowDetail,
  updateStockCilokApi,
} from "../../api/stock-management";
import { handleError } from "../../../utils/error";

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
