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
  active: boolean;
}

interface AddUser {
  name: string;
  email: string;
  password: string;
  permission: string[];
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

type BaseResponse = {
  message: string;
  statusCode: number;
  error?: string;
};
