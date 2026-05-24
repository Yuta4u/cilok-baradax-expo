import { useQuery } from "@tanstack/react-query";
import { getAllProductApi } from "../../api/product";

export const useGetAllProductQuery = () => {
  return useQuery({
    queryKey: ["product:all"],
    queryFn: getAllProductApi,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};
