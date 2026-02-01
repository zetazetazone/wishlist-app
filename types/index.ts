export * from './database.types';

export interface AuthUser {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

export interface Session {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
}
