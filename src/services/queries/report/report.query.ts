// src/services/queries/sales-report.ts
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  getSalesReport2,
  getSalesReportUsers,
} from "../../api/report/report.api";

const PAGE_LIMIT = 20;

export function useSalesReportQuery(
  userId: string | "all",
  sd: string,
  ed: string,
  q = "",
) {
  return useInfiniteQuery({
    queryKey: ["sales-report", { userId, sd, ed, q }],
    queryFn: ({ pageParam }) =>
      getSalesReport2({
        userId,
        sd,
        ed,
        q,
        page: pageParam,
        limit: PAGE_LIMIT,
      }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta?.page < last.meta?.totalPages ? last.meta?.page + 1 : undefined,
  });
}

export function useSalesReportUsersQuery() {
  return useQuery({
    queryKey: ["sales-report-users"],
    queryFn: getSalesReportUsers,
    staleTime: 5 * 60 * 1000,
  });
}
