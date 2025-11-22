import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getAuth } from "firebase/auth";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      const text = await res.text();
      throw new Error(`${res.status}: ${text || res.statusText}`);
    } catch (error) {
      // If we can't read the response text, just use status
      throw new Error(`${res.status}: ${res.statusText}`);
    }
  }
}

export async function apiRequest(
  url: string,
  method: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Get the Firebase auth token
  const auth = getAuth();
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    throw new Error("User not authenticated");
  }
  
  const token = await currentUser.getIdToken();
  
  // For GET requests, append data as query parameters if provided
  let finalUrl = url;
  const headers: Record<string, string> = {
    ...(data && method !== 'GET' ? { "Content-Type": "application/json" } : {}),
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
  };
  
  const options: RequestInit = {
    method,
    headers,
    credentials: "include",
  };
  
  // Only add body for non-GET requests
  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  } else if (data && method === 'GET') {
    // Convert data to query params for GET requests
    const params = new URLSearchParams();
    Object.entries(data as Record<string, any>).forEach(([key, value]) => {
      params.append(key, String(value));
    });
    finalUrl = `${url}${url.includes('?') ? '&' : '?'}${params.toString()}`;
  }
  
  const res = await fetch(finalUrl, options);
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get the Firebase auth token
    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken();
    
    const headers: Record<string, string> = {
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    };
    
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      // Caching strategy: Keep data fresh with smart timing
      staleTime: 5 * 60 * 1000, // 5 minutes - balance between freshness and server load
      gcTime: 10 * 60 * 1000, // 10 minutes - keep unused queries in cache for reuse
      refetchInterval: false,
      refetchOnWindowFocus: false, // Don't spam server when window refocuses
      retry: 1, // Retry failed requests once (handles transient errors)
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    },
    mutations: {
      retry: 0, // Don't retry mutations - user should retry intentionally
    },
  },
});
