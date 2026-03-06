import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getAllKaryawanApi,
  updateStockCilokApi,
} from "../../api/stock-management";
import { handleError } from "../../../utils/error";

export const useGetAllKaryawanQuery = () => {
  return useQuery({
    queryKey: ["karyawan:all"],
    queryFn: getAllKaryawanApi,
    refetchOnMount: true,
  });
};

export const useUpdateStockCilokMutation = () => {
  return useMutation({
    mutationFn: updateStockCilokApi,
    onError: handleError,
  });
};
