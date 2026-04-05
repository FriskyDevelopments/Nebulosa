import { QueryClient } from "@tanstack/react-query";
import { getMockResponse } from "../mocks/handlers";

/**
 * Validate an HTTP Response and throw an Error for non-OK status codes.
 *
 * @param res - The Response object to validate
 * @throws Error - When `res.ok` is false; message formatted as `"<status>: <text>"` where `<text>` is the response body text if present, otherwise `res.statusText`
 */
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * Performs an HTTP request to the specified URL with the given method, optionally returning a mock response when mock mode is enabled.
 *
 * When `data` is provided it is JSON-serialized and sent with a `Content-Type: application/json` header. In mock mode the function may return a Response constructed from predefined mock data; otherwise it performs a real network request. Throws an Error for non-OK HTTP responses.
 *
 * @param method - The HTTP method to use (e.g., "GET", "POST")
 * @param url - The request URL
 * @param data - Optional payload to JSON-serialize and include as the request body
 * @returns The Response from the HTTP request or, if mock mode applies, a Response constructed from mock data
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response> {
  // Check if mock mode is enabled
  const useMocks = import.meta.env.VITE_USE_MOCKS === "true";

  if (useMocks) {
    // Simulate network delay for realism
    await new Promise((resolve) => setTimeout(resolve, 500));

    const mockRes = getMockResponse(method, url);
    if (mockRes) {
      console.log(`[Mock] Intercepted ${method} ${url} with status ${mockRes.status}`);
      return new Response(JSON.stringify(mockRes.data), {
        status: mockRes.status,
        headers: { "Content-Type": "application/json" }
      });
    } else {
      console.warn(`[Mock] Unhandled route: ${method} ${url}`);
      // Fall through to real request if mock is not defined
    }
  }

  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });
  await throwIfResNotOk(res);
  return res;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
