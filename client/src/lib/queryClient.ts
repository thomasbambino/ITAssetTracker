import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Improved error handling for response validation
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      // Try to get the text, but handle issues with HTML responses
      const text = await res.text();
      // Check if this is an HTML response (typically containing a DOCTYPE)
      if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        // If we get an HTML response for a GET request to /api/users/me, it usually means session has expired
        if (res.url.endsWith('/api/users/me')) {
          window.location.href = '/auth/login'; // Force redirect to login
          throw new Error(`Session expired or invalid. Redirecting to login page.`);
        }
        throw new Error(`${res.status}: Server returned an HTML page instead of JSON. Your session may have expired.`);
      }
      
      // Try to parse as JSON to provide better error message
      try {
        const errorJson = JSON.parse(text);
        if (errorJson.message) {
          throw new Error(`${res.status}: ${errorJson.message}`);
        }
      } catch (jsonError) {
        // Not JSON, use the text directly
      }
      
      throw new Error(`${res.status}: ${text || res.statusText}`);
    } catch (parseError) {
      // If we can't read the response text at all, use the status text
      if (parseError instanceof Error && parseError.message.includes('Redirecting to login')) {
        throw parseError; // Rethrow the redirect error
      }
      throw new Error(`${res.status}: ${res.statusText}`);
    }
  }
}

export async function apiRequest({
  url,
  method,
  data,
}: {
  url: string;
  method: string;
  data?: any;
}): Promise<any> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cache-Control': 'no-cache' // Prevent caching
    };
    
    const options: RequestInit = {
      method,
      headers,
      credentials: "include",
      cache: "no-store" // Prevent caching
    };
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }
    
    console.log(`Making ${method} request to ${url}`);
    
    const res = await fetch(url, options);
    
    // Handle auth redirect for login specifically
    if (res.status === 401 && url === '/api/auth/login') {
      // Special case for failed login
      const errorData = await res.json();
      return errorData; // Return the error response directly
    }
    
    await throwIfResNotOk(res);
    
    // Parse JSON response if it's not a 204 No Content
    if (res.status !== 204) {
      try {
        return await res.json();
      } catch (error) {
        console.error(`Error parsing JSON response from ${url}:`, error);
        // If it's the users/me endpoint and we have parsing issues, redirect to login
        if (url === '/api/users/me') {
          window.location.href = '/auth/login';
          throw new Error(`Session expired. Redirecting to login page.`);
        }
        throw new Error(`Failed to parse server response as JSON. Your session might have expired.`);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error(`API Request error (${method} ${url}):`, error);
    
    // If the error indicates redirection to login, don't rethrow (redirect is already happening)
    if (error instanceof Error && error.message.includes('Redirecting to login')) {
      return null;
    }
    
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw" | "redirect";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const [endpoint, params] = queryKey as [string, Record<string, any>?];
    
    // Build URL with query parameters if they exist
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
      
      const queryString = searchParams.toString();
      if (queryString) {
        url = `${url}?${queryString}`;
      }
    }
    
    const res = await fetch(url, {
      credentials: "include",
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      cache: "no-store" // Prevent caching
    });

    if (res.status === 401) {
      if (unauthorizedBehavior === "returnNull") {
        return null;
      } else if (unauthorizedBehavior === "redirect") {
        window.location.href = '/auth/login';
        return null;
      }
      // else it will throw below
    }

    await throwIfResNotOk(res);
    
    try {
      return await res.json();
    } catch (error) {
      console.error(`Error parsing JSON in getQueryFn for ${url}:`, error);
      // If it's the users/me endpoint and we have parsing issues, redirect to login
      if (url === '/api/users/me') {
        window.location.href = '/auth/login';
        throw new Error(`Session expired. Redirecting to login page.`);
      }
      throw new Error(`Failed to parse server response as JSON. Your session might have expired.`);
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "redirect" }), // Changed to redirect on 401
      refetchInterval: false,
      refetchOnWindowFocus: true, // Enable refreshing when window regains focus
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1, // Single retry for all queries
    },
    mutations: {
      retry: false,
    },
  },
});
