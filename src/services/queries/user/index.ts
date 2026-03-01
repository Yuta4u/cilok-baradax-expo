import { useMutation, useQuery } from "@tanstack/react-query";
import { addUserApi, getAllUserApi, setActiveApi } from "../../api/user";
import { handleError } from "../../../utils/error";

export const useGetAllUserQuery = () => {
  return useQuery({
    queryFn: getAllUserApi,
    queryKey: ["user:all"],
    refetchOnMount: true,
    retryOnMount: true,
  });
};

export const useAddUserMutation = () => {
  return useMutation({
    mutationFn: addUserApi,
    onError: handleError,
  });
};

export const useSetActiveMutation = () => {
  return useMutation({
    mutationFn: setActiveApi,
    onError: handleError,
  });
};
