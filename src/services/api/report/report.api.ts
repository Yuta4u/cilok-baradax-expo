// src/services/api/sales-report.ts

import { useAuthStore } from "../../../utils/authStore";
import { ToastError } from "../../../utils/toast";
import { API_URL } from "../../../../constant";
import { fetch as fetchBuffer } from "expo/fetch";

/* ─── Types ─────────────────────────────────────────────────────────────── */

export type SalesReportItem = {
  id: number;
  createdAt: string; // ISO
  userId: number;
  userName: string;
  /** Kolom `in` di cash_flows (penjualan tunai) */
  cash: number;
  qris: number;
  shopeeFood: number;
  grabFood: number;
  goFood: number;
  /** Kolom `out` di cash_flows */
  out: number;
  /** cash + qris + shopeeFood + grabFood + goFood */
  totalSales: number;
  note?: string | null;
  verified: 0 | 1 | 2;
};

export type SalesReportUser = {
  id: string;
  name: string;
};

export type SalesReportParams = {
  userId: number | "all";
  /** Format YYYY-MM-DD (tanggal lokal) */
  dateFrom: string;
  dateTo: string;
  page: number;
  limit: number;
};

export type SalesReportSummary = {
  totalSales: number;
  totalCash: number;
  totalQris: number;
  totalOnline: number;
  totalOut: number;
};

export type SalesReportResponse = {
  data: SalesReportItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    summary: SalesReportSummary;
  };
};

/* ─── Helpers ───────────────────────────────────────────────────────────── */

export function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function getSalesReportUsers(): Promise<SalesReportUser[]> {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(`${API_URL}/user/report`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    const message = Array.isArray(data.message)
      ? data.message.join(", ")
      : data.message || "Something went wrong, please try again later.";

    ToastError(message);
    throw new Error(message);
  }

  return data;
}

// export async function getSalesReport(
//   params: SalesReportParams,
// ): Promise<SalesReportResponse> {
//   // TODO: ganti dengan request API asli, mis.
//   // GET /reports/sales?userId=&dateFrom=&dateTo=&page=&limit=
//   await wait(500);

//   const filtered = DUMMY_DATA.filter((it) => {
//     if (params.userId !== "all" && it.userId !== params.userId) return false;
//     const ymd = toYMD(new Date(it.createdAt));
//     return ymd >= params.dateFrom && ymd <= params.dateTo;
//   });

//   const summary = filtered.reduce<SalesReportSummary>(
//     (acc, it) => ({
//       totalSales: acc.totalSales + it.totalSales,
//       totalCash: acc.totalCash + it.cash,
//       totalQris: acc.totalQris + it.qris,
//       totalOnline: acc.totalOnline + it.shopeeFood + it.grabFood + it.goFood,
//       totalOut: acc.totalOut + it.out,
//     }),
//     { totalSales: 0, totalCash: 0, totalQris: 0, totalOnline: 0, totalOut: 0 },
//   );

//   const total = filtered.length;
//   const totalPages = Math.max(1, Math.ceil(total / params.limit));
//   const start = (params.page - 1) * params.limit;

//   console.log(total, "testx");

//   return {
//     data: filtered.slice(start, start + params.limit),
//     meta: {
//       total,
//       page: params.page,
//       limit: params.limit,
//       totalPages,
//       summary,
//     },
//   };
// }

export async function getSalesReport2(
  query: BaseParams,
): Promise<SalesReportResponse> {
  const { accessToken } = useAuthStore.getState();

  const params = new URLSearchParams();

  params.set("page", String(query?.page ?? 1));
  params.set("limit", String(query?.limit ?? 10));

  if (query.q) params.set("q", query.q);
  if (query.sd) params.set("sd", query.sd);
  if (query.ed) params.set("ed", query.ed);
  if (query.type) params.set("type", query.type);
  if (query.userId) params.set("userId", query.userId);

  const res = await fetch(
    `${API_URL}/cash-flow/report?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const data = await res.json();

  if (!res.ok) {
    const message = Array.isArray(data.message)
      ? data.message.join(", ")
      : data.message || "Something went wrong, please try again later.";

    ToastError(message);
    throw new Error(message);
  }

  return data as SalesReportResponse;
}

/** Download the sales report as .xlsx bytes, using the same filters as the list. */
export async function getSalesReportExcel(query: BaseParams) {
  const { accessToken } = useAuthStore.getState();

  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.sd) params.set("sd", query.sd);
  if (query.ed) params.set("ed", query.ed);
  if (query.userId) params.set("userId", query.userId);

  const res = await fetchBuffer(
    `${API_URL}/cash-flow/report/excel?${params.toString()}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const message =
      data?.message || "Something went wrong, please try again later.";
    ToastError(message);
    throw new Error(message);
  }

  return await res.bytes();
}
