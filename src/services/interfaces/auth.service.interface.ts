/**
 * Authentication Service Interface
 *
 * Defines the contract for authentication operations.
 * All authentication implementations must follow this interface.
 */

import type { TokenPair } from '../../core/paseto/token.types';

export interface AuthActivityContext {
  /** ID of the user performing the action (for activity logging) */
  performedBy?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
}

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
  name?: string | null;
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
  /** Email or username for login */
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
  accessToken: string;
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
   * @param activityContext - Optional activity context (IP, user agent, device type)
   * @returns User data and authentication tokens
   * @throws ConflictError if email already exists
   * @throws ValidationError if input is invalid
   */
  register(input: RegisterInput, activityContext?: AuthActivityContext): Promise<RegisterOutput>;

  /**
   * Authenticate user with email and password
   * @param input - Login credentials
   * @param activityContext - Optional activity context (IP, user agent, device type)
   * @returns User data and authentication tokens
   * @throws AuthenticationError if credentials are invalid
   * @throws ForbiddenError if user account is inactive
   */
  login(input: LoginInput, activityContext?: AuthActivityContext): Promise<LoginOutput>;

  /**
   * Refresh access token using refresh token
   * @param input - Refresh token
   * @param activityContext - Optional activity context (IP, user agent, device type)
   * @returns New token pair
   * @throws InvalidTokenError if refresh token is invalid
   * @throws TokenExpiredError if refresh token has expired
   * @throws NotFoundError if session is not found or revoked
   */
  refreshToken(input: RefreshTokenInput, activityContext?: AuthActivityContext): Promise<RefreshTokenOutput>;

  /**
   * Logout user and revoke session
   * @param input - User ID and token ID
   * @param activityContext - Optional activity context (IP, user agent, device type)
   * @throws NotFoundError if session is not found
   */
  logout(input: LogoutInput, activityContext?: AuthActivityContext): Promise<void>;

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
