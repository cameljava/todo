export interface User {
  username: string;
  email?: string;
  userId: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}
