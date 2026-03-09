/**
 * User Service Interface
 *
 * Defines the contract for user management operations.
 * All user management implementations must follow this interface.
 */

export interface GetProfileInput {
  userId: string;
}

export interface GetProfileOutput {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateProfileInput {
  userId: string;
  firstName?: string;
  lastName?: string;
}

export interface UpdateProfileOutput {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdatePasswordInput {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

export interface UpdatePasswordOutput {
  message: string;
}

export interface GetUsersInput {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface UserListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export interface GetUsersOutput {
  users: UserListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
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

export interface CreateUserOutput {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateUserInput {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  emailVerified?: boolean;
}

export interface UpdateUserOutput {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeleteUserOutput {
  message: string;
}

export interface GetUserStatsOutput {
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  newUsersThisMonth: number;
  newUsersThisWeek: number;
}

export interface IUsersService {
  /**
   * Get user profile by ID
   * @param input - User ID
   * @returns User profile data
   * @throws NotFoundError if user not found
   */
  getProfile(input: GetProfileInput): Promise<GetProfileOutput>;

  /**
   * Update user profile
   * @param input - User ID and fields to update
   * @returns Updated user profile
   * @throws NotFoundError if user not found
   * @throws ValidationError if input is invalid
   */
  updateProfile(input: UpdateProfileInput): Promise<UpdateProfileOutput>;

  /**
   * Update user password
   * @param input - User ID, current password, and new password
   * @returns Success message
   * @throws NotFoundError if user not found
   * @throws AuthenticationError if current password is invalid
   * @throws ValidationError if new password is invalid
   */
  updatePassword(input: UpdatePasswordInput): Promise<UpdatePasswordOutput>;

  /**
   * Get paginated list of users
   * @param input - Pagination and filter parameters
   * @returns Paginated user list
   */
  getUsers(input: GetUsersInput): Promise<GetUsersOutput>;

  /**
   * Create a new user (admin function)
   * @param input - User creation data
   * @returns Created user data
   * @throws ConflictError if email already exists
   * @throws ValidationError if input is invalid
   */
  createUser(input: CreateUserInput): Promise<CreateUserOutput>;

  /**
   * Update user (admin function)
   * @param input - User ID and fields to update
   * @returns Updated user data
   * @throws NotFoundError if user not found
   * @throws ConflictError if email already exists
   * @throws ValidationError if input is invalid
   */
  updateUser(input: UpdateUserInput): Promise<UpdateUserOutput>;

  /**
   * Delete user (admin function)
   * @param id - User ID to delete
   * @returns Success message
   * @throws NotFoundError if user not found
   */
  deleteUser(id: string): Promise<DeleteUserOutput>;

  /**
   * Get user statistics
   * @returns User statistics
   */
  getUserStats(): Promise<GetUserStatsOutput>;
}

export type UsersServiceDependencies = {
  unitOfWork: unknown;
  passwordService: unknown;
};
