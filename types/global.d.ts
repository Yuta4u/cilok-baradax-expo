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
}
