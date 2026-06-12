import { useMutation, useQuery } from "@tanstack/react-query";
import { handleError } from "../../../utils/error";
import {
  addCashFlow,
  addReportApi,
  confirmReportApi,
  getAllCashFlowApi,
  getCabangToday,
  getCashFlowByIdApi,
  getDashboard,
  getViewCashFlowApi,
} from "../../api/dashboard";

export const useDashboardQuery = () => {
  return useQuery({
    queryKey: ["dashboard:all"],
    queryFn: getDashboard,
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

//
export const useAddCashFlowMutation = () => {
  return useMutation({
    mutationFn: addCashFlow,
    onError: handleError,
  });
};

export const useGetAllCashFlowQuery = (query: BaseParams) => {
  return useQuery({
    queryFn: () => getAllCashFlowApi(query),
    queryKey: ["cash-flow:all", query],
    refetchOnMount: true,
    retryOnMount: true,
  });
};

export const useGetCashFlowByIdQuery = (id?: string, enabled?: boolean) => {
  return useQuery({
    queryFn: () => getCashFlowByIdApi(id),
    queryKey: ["cash-flow:byId", id],
    refetchOnMount: true,
    retryOnMount: true,
    retry: 2,
    enabled: !!id && !!enabled,
  });
};

export const useViewCashFlowQuery = (id?: string, enabled?: boolean) => {
  return useQuery({
    queryFn: () => getViewCashFlowApi(id),
    queryKey: ["cash-flow:view", id],
    refetchOnMount: true,
    retryOnMount: true,
    retry: 2,
    enabled: !!id && !!enabled,
  });
};

export const useAddReportMutation = () => {
  return useMutation({
    mutationFn: addReportApi,
    onError: handleError,
  });
};

export const useConfirmReportMutation = () => {
  return useMutation({
    mutationFn: confirmReportApi,
    onError: handleError,
  });
};
