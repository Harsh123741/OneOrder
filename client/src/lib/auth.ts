import { apiRequest } from "./queryClient";

export interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  walletBalance: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export async function login(data: LoginData): Promise<{ user: AuthUser; token: string }> {
  const response = await apiRequest("POST", "/api/auth/login", data);
  const result = await response.json();
  
  if (result.token) {
    localStorage.setItem("auth_token", result.token);
  }
  
  return result;
}

export async function register(data: RegisterData): Promise<{ user: AuthUser; token: string }> {
  const response = await apiRequest("POST", "/api/auth/register", data);
  const result = await response.json();
  
  if (result.token) {
    localStorage.setItem("auth_token", result.token);
  }
  
  return result;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = localStorage.getItem("auth_token");
  if (!token) return null;
  
  try {
    const response = await fetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      localStorage.removeItem("auth_token");
      return null;
    }
    
    return await response.json();
  } catch (error) {
    localStorage.removeItem("auth_token");
    return null;
  }
}

export function logout() {
  localStorage.removeItem("auth_token");
  window.location.reload();
}

export function getAuthToken(): string | null {
  return localStorage.getItem("auth_token");
}
