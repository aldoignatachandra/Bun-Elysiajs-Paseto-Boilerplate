/**
 * Authentication Service Interface
 *
 * Defines the contract for authentication operations.
 * All authentication implementations must follow this interface.
 */

import type { TokenPair } from '../../core/paseto/token.types';

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface RegisterOutput {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    createdAt: Date;
  };
  tokens: TokenPair;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginOutput {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    lastLoginAt: Date | null;
  };
  tokens: TokenPair;
}

export interface RefreshTokenInput {
  refreshToken: string;
}

export interface RefreshTokenOutput {
  tokens: TokenPair;
}

export interface LogoutInput {
  userId: string;
  tokenId: string;
}

export interface ValidateAccessTokenInput {
  token: string;
}

export interface ValidateAccessTokenOutput {
  valid: boolean;
  userId: string | null;
  payload: Record<string, unknown> | null;
  error?: string;
}

export interface IAuthService {
  /**
   * Register a new user
   * @param input - User registration data
   * @returns User data and authentication tokens
   * @throws ConflictError if email already exists
   * @throws ValidationError if input is invalid
   */
  register(input: RegisterInput): Promise<RegisterOutput>;

  /**
   * Authenticate user with email and password
   * @param input - Login credentials
   * @returns User data and authentication tokens
   * @throws AuthenticationError if credentials are invalid
   * @throws ForbiddenError if user account is inactive
   */
  login(input: LoginInput): Promise<LoginOutput>;

  /**
   * Refresh access token using refresh token
   * @param input - Refresh token
   * @returns New token pair
   * @throws InvalidTokenError if refresh token is invalid
   * @throws TokenExpiredError if refresh token has expired
   * @throws NotFoundError if session is not found or revoked
   */
  refreshToken(input: RefreshTokenInput): Promise<RefreshTokenOutput>;

  /**
   * Logout user and revoke session
   * @param input - User ID and token ID
   * @throws NotFoundError if session is not found
   */
  logout(input: LogoutInput): Promise<void>;

  /**
   * Validate an access token
   * @param input - Access token
   * @returns Validation result with user data if valid
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  validateAccessToken(input: ValidateAccessTokenInput): Promise<ValidateAccessTokenOutput>;
}

export type AuthServiceDependencies = {
  unitOfWork: unknown;
  pasetoService: unknown;
  passwordService: unknown;
};
