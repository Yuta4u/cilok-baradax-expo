// src/services/api/stock-history.ts

import { useAuthStore } from "../../../utils/authStore";
import { ToastError } from "../../../utils/toast";

export type StockHistoryType = "all" | "in" | "out";

export type StockHistoryItem = {
  id: number;
  productName: string;
  uom: string;
  qty: number;
  type: "in" | "out";
  note: string | null;
  createdAt: string;
};

export type StockHistoryResponse = {
  data: StockHistoryItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    hasNextPage: boolean;
  };
};

export type GetStockHistoryParams = {
  page: number;
  limit?: number;
  type?: StockHistoryType;
  search?: string;
};

export async function getStockHistoryApi({
  page,
  limit = 15,
  type = "all",
  search,
}: GetStockHistoryParams): Promise<StockHistoryResponse> {
  const { accessToken } = useAuthStore.getState();

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (type !== "all") params.set("type", type);
  if (search) params.set("search", search);

  const res = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/api/stock-histories?${params.toString()}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const data = await res.json();
  console.log(data, "test");

  if (!res.ok) {
    ToastError(
      data.message || "Something went wrong, please try again laters.",
    );
    throw new Error(data.message);
  }

  return data;
}
