import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      const text = (await res.text()) || res.statusText;
      console.error(`Response error: ${res.status} ${res.statusText}`, text);
      throw new Error(`${res.status}: ${text}`);
    } catch (error) {
      console.error("Error parsing error response:", error);
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
    const headers: HeadersInit = {};
    
    // Don't set Content-Type for FormData, let the browser set it automatically
    const isFormData = data instanceof FormData;
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    
    const options: RequestInit = {
      method,
      headers,
      credentials: "include",
    };
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = isFormData ? data : JSON.stringify(data);
    }
    
    console.log(`Making ${method} request to ${url}`, options);
    
    const res = await fetch(url, options);
    await throwIfResNotOk(res);
    
    // Parse JSON response if it's not a 204 No Content
    if (res.status !== 204) {
      try {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await res.json();
        } else {
          const text = await res.text();
          console.error('Received non-JSON response:', text);
          console.error('Content-Type:', contentType);
          return { success: true, message: "Operation completed but server returned non-JSON response" };
        }
      } catch (jsonError) {
        console.error('Error parsing JSON response:', jsonError);
        throw new Error(`Failed to parse server response: ${jsonError}`);
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
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await res.json();
      } else {
        const text = await res.text();
        console.error('Received non-JSON response in query:', text);
        console.error('Content-Type:', contentType);
        return { success: false, message: "Server returned non-JSON response" };
      }
    } catch (jsonError) {
      console.error('Error parsing JSON response in query:', jsonError);
      throw new Error(`Failed to parse server response: ${jsonError}`);
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
