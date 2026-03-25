export interface GetProfileInput {
  userId: string;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  name: string | null;
  role: string;
  lastLoginAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileInput {
  userId: string;
  name?: string;
  username?: string;
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
    username: string;
    name: string | null;
    role: string;
    createdAt: string;
    lastLoginAt: string | null;
    deletedAt: string | null;
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
  username: string;
  password: string;
  name?: string;
  role?: string;
}

export interface UpdateUserInput {
  id: string;
  email?: string;
  username?: string;
  name?: string;
  role?: string;
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

export interface UserActivityContext {
  performedBy?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface IUsersService {
  getProfile(input: GetProfileInput): Promise<UserProfile>;
  updateProfile(input: UpdateProfileInput & UserActivityContext): Promise<UserProfile>;
  updatePassword(input: UpdatePasswordInput & UserActivityContext): Promise<{ message: string }>;
  getUsers(input: GetUsersInput): Promise<GetUsersOutput>;
  createUser(input: CreateUserInput & UserActivityContext): Promise<UserProfile>;
  updateUser(input: UpdateUserInput & UserActivityContext): Promise<UserProfile>;
  deleteUser(id: string, force?: boolean, activityContext?: UserActivityContext): Promise<{ message: string }>;
  activateUser(id: string, activityContext?: UserActivityContext): Promise<{ message: string }>;
  deactivateUser(id: string, activityContext?: UserActivityContext): Promise<{ message: string }>;
  restoreUser(id: string, activityContext?: UserActivityContext): Promise<{ message: string }>;
  getActivityLogs(input: GetActivityLogsInput): Promise<GetActivityLogsOutput>;
  getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    newUsersThisMonth: number;
    newUsersThisWeek: number;
  }>;
}

export type UsersServiceDependencies = {
  unitOfWork: unknown;
  passwordService: unknown;
};
