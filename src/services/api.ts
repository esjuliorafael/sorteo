const API_URL = "/api";

const getHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

async function request(endpoint: string, options: RequestInit = {}, retry = true): Promise<any> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {}),
    },
  });

  // Handle 401/403 for token refresh
  if ((res.status === 401 || res.status === 403) && retry) {
    const refreshToken = localStorage.getItem("refresh_token");
    // Don't retry if we are already trying to refresh or login
    if (refreshToken && endpoint !== "/auth/refresh" && endpoint !== "/auth/login") {
      try {
        const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const { token } = await refreshRes.json();
          localStorage.setItem("token", token);
          // Retry the original request with the new token
          return request(endpoint, options, false);
        } else {
          // Refresh failed, clear tokens and let the app handle logout
          localStorage.removeItem("token");
          localStorage.removeItem("refresh_token");
          window.dispatchEvent(new Event("auth_failed"));
        }
      } catch (err) {
        console.error("Token refresh failed:", err);
      }
    }
  }

  // Handle errors (including 429 Too Many Requests)
  if (!res.ok) {
    const text = await res.text();
    let errorMessage = text;
    try {
      const json = JSON.parse(text);
      errorMessage = json.error || json.message || text;
    } catch (e) {
      // Not JSON
    }
    throw new Error(errorMessage);
  }
  
  return res.json();
}

export const api = {
  async get(endpoint: string) {
    return request(endpoint);
  },
  async post(endpoint: string, body: any) {
    return request(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  async put(endpoint: string, body: any) {
    return request(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },
  async delete(endpoint: string) {
    return request(endpoint, {
      method: "DELETE",
    });
  },
};
