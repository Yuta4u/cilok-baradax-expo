interface Response {
  message: string;
  statusCode: number;
  success: boolean;
  accessToken?: string;
  user?: User;
}

interface AddReport {
  quantities: Record<string, string>;
  out: number;
  note: string;
}

interface ConfirmReport {
  id: string;
  quantities: Record<string, string>;
}

interface User {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  name: string;
  email: string;
  password: string;
  permission: number;
  stockCilok: number;
  active: boolean;
}

interface UpdateStockCilok {
  id: string;
  quantity: string;
}

class UpdateStockCilok {
  id: string;
  quantity: number;
}

class UpdateStockIngredient {
  id: string;
  quantity: number;
  type: number;
}

class UpdateStockProduct {
  id: string;
  quantity: number;
  type: number;
}

class UpdateMinimalStockIngredient {
  id: string;
  minimalStock: number;
}

interface Product {
  createdAt: string;
  deletedAt?: string;
  name: string;
  icon: string;
  id: string;
  uom: string;
  stock: string;
  updatedAt: string;
}

interface Ingredient {
  createdAt: string;
  deletedAt?: string;
  name: string;
  icon: string;
  id: string;
  uom: string;
  minimalStock: string;
  price: number;
  stock: string;
  updatedAt: string;
}

interface Metadata {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

interface AddProduct {
  name: string;
  minimalStock: number;
  price: number;
}

interface UpdateStock {
  id: string;
  quantity: number;
  type: "inc" | "dec";
  note: string;
}

type CashFlowDetail = {
  id: number | string;
  productId?: number | string;
  qty?: number;
  in?: number;
  price?: number;
  name?: string;
  product?: { id?: number | string; name?: string; price?: number };
};

interface Cabang {
  id: string;
  name: string;
  totalTransaksi: string;
  totalOmset: string;
  deletedAt?: string;
  verified: number;
}

interface Product {
  id: string;
  name: string;
  stock: 0;
  minimalStock: 0;
  uom: string;
  status: boolean;
}

interface AddUser {
  name: string;
  email: string;
  password: string;
  permission: string[];
}

interface AddCashFlow {
  id: string;
  cashFlowItems: Record<string, { qty: number; price: number }>;
}

interface AddIngredient {
  name: string;
  uom: string;
  price: number;
  icon: string;
}

type ApiError = {
  Error: unknown;
  message: string;
  statusCode: number;
  error: {
    children: never[];
    constraints: {
      string: string;
    };
    property: string;
    email: string;
  }[];
};

interface BaseParams {
  page?: number;
  limit?: number;
  q?: string;
  type?: string;
}

interface ICashFlow {
  id: string;
  createdAt: string;
  in: number;
  out: number;
  note: string;
  verified: 0 | 1 | 2;
  user: IUser;
  cashFlowItems: ICashFlowItem[];
}

interface ICashFlowItem {
  id: string;
  in: number;
  out?: number;
  price: number;
  totalPrice: number;
  cashFlow: ICashFlow;
  product: IProduct;
}

interface IProduct {
  name: string;
  uom: string;
  stock: number;
  minimalStock: number;
  price: number;
  cashFlowItems: ICashFlowItem[];
}

interface IUser {
  name: string;
  email: string;
  password: string;
  stockCilok: number;
  permission: number;
}

interface IHistory {
  qty: number;
  note: string;
  product: IProduct;
}

interface CashFlow {
  id: string;
  createdAt: string;
  in: string;
  out: string;
  note: string;
  name: string;
  verified: number;
  setDialogVisible: (f: boolean) => void;
  setViewId: (id: string) => void;
}

type BaseResponse = {
  message: string;
  statusCode: number;
  error?: string;
};
