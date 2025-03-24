import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      // Try to get the text, but handle issues with HTML responses
      const text = await res.text();
      // Check if this is an HTML response (typically containing a DOCTYPE)
      if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        throw new Error(`${res.status}: Server returned an HTML page instead of JSON. Your session may have expired.`);
      }
      throw new Error(`${res.status}: ${text || res.statusText}`);
    } catch (parseError) {
      // If we can't read the response text at all, use the status text
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
      'Content-Type': 'application/json'
    };
    
    const options: RequestInit = {
      method,
      headers,
      credentials: "include",
    };
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }
    
    console.log(`Making ${method} request to ${url}`, options);
    
    const res = await fetch(url, options);
    await throwIfResNotOk(res);
    
    // Parse JSON response if it's not a 204 No Content
    if (res.status !== 204) {
      try {
        return await res.json();
      } catch (error) {
        console.error(`Error parsing JSON response from ${url}:`, error);
        throw new Error(`Failed to parse server response as JSON. Your session might have expired.`);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error(`API Request error (${method} ${url}):`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
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
        'Accept': 'application/json'
      }
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    
    try {
      return await res.json();
    } catch (error) {
      console.error(`Error parsing JSON in getQueryFn for ${url}:`, error);
      throw new Error(`Failed to parse server response as JSON. Your session might have expired.`);
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
