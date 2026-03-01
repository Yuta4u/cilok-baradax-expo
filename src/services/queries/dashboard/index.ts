import { useMutation, useQuery } from "@tanstack/react-query";
import { handleError } from "../../../utils/error";
import { addCashFlow, getAllCashFlowApi } from "../../api/dashboard";

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
