import { useQuery } from "@tanstack/react-query";

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'user';
  isManager: boolean;
  passwordResetRequired: boolean;
}

export function useAuth() {
  const { data: user, isLoading, isError, error } = useQuery<User>({
    queryKey: ['/api/users/me'],
    retry: 3,
    retryDelay: 1000,
  });

  return {
    user,
    isLoading,
    isError,
    error,
    isAuthenticated: !!user && !isError,
    isAdmin: user?.role === 'admin',
  };
}