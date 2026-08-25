export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type Status = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'DELETED';

export interface Permission {
  id: string;
  name: string;
  module: string;
  description?: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  status: Status;
  permissions?: string[];
  rolePermissions?: {
    permissionId?: string;
    permission?: {
      id?: string;
      name: string;
    };
  }[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  gender: Gender;
  avatar?: string | null;
  image?: string | null;
  signature?: string | null;
  status: Status;
  roleId: string;
  role?: Role;
  permissions?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken?: string;
}
