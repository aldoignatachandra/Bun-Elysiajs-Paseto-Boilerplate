export interface GetProfileInput {
  userId: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateProfileInput {
  userId: string;
  firstName?: string;
  lastName?: string;
}

export interface UpdatePasswordInput {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

export interface GetUsersInput {
  page: number;
  limit: number;
  search?: string;
  includeDeleted?: boolean;
  onlyDeleted?: boolean;
}

export interface GetUsersOutput {
  users: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    emailVerified: boolean;
    createdAt: Date;
    lastLoginAt: Date | null;
    deletedAt: Date | null;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  isActive?: boolean;
  emailVerified?: boolean;
}

export interface UpdateUserInput {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  emailVerified?: boolean;
}

export interface GetActivityLogsInput {
  page: number;
  limit: number;
  userId?: string;
  action?: string;
  resource?: string;
}

export interface GetActivityLogsOutput {
  logs: Array<{
    id: string;
    userId: string;
    action: string;
    resource: string;
    createdAt: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface IUsersService {
  getProfile(input: GetProfileInput): Promise<UserProfile>;
  updateProfile(input: UpdateProfileInput): Promise<UserProfile>;
  updatePassword(input: UpdatePasswordInput): Promise<{ message: string }>;
  getUsers(input: GetUsersInput): Promise<GetUsersOutput>;
  createUser(input: CreateUserInput): Promise<UserProfile>;
  updateUser(input: UpdateUserInput): Promise<UserProfile>;
  deleteUser(id: string, force?: boolean): Promise<{ message: string }>;
  activateUser(id: string): Promise<{ message: string }>;
  deactivateUser(id: string): Promise<{ message: string }>;
  restoreUser(id: string): Promise<{ message: string }>;
  getActivityLogs(input: GetActivityLogsInput): Promise<GetActivityLogsOutput>;
  getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    verifiedUsers: number;
    newUsersThisMonth: number;
    newUsersThisWeek: number;
  }>;
}

export type UsersServiceDependencies = {
  unitOfWork: unknown;
  passwordService: unknown;
};
