interface Response {
  message: string;
  statusCode: number;
  success: boolean;
  accessToken?: string;
  user?: User;
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

interface AddUser {
  name: string;
  email: string;
  password: string;
  permission: string[];
}

interface AddCashFlow {
  type: string;
  amount: number;
  note: string;
}

interface AddIngredient {
  name: string;
  uom: string;
  price: number;
  icon: string;
}

interface AddProduct {
  name: string;
  uom: string;
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

interface CashFlow {
  id: string;
  createdAt: string;
  amount: number;
  type: string;
  note: string;
  name: string;
}

type BaseResponse = {
  message: string;
  statusCode: number;
  error?: string;
};
