// src/services/queries/stock-history.ts
import { useInfiniteQuery } from "@tanstack/react-query";
import { getStockHistoryApi, StockHistoryType } from "../../api/stock-log";

export function useStockHistoryQuery(type: StockHistoryType, search: string) {
  return useInfiniteQuery({
    queryKey: ["stock-history", type, search],
    queryFn: ({ pageParam }) =>
      getStockHistoryApi({ page: pageParam as number, type, search }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined,
  });
}
