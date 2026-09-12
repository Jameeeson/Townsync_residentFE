import { apiClient, clearAccessToken, setAccessToken } from "@/lib/apiClient";

export interface LoginTokenResponse {
  access_token: string;
  token_type: string;
}


//stest
export interface AuthMeResponse {
  user_id: number;
  email: string;
  role: string;
  status: string;
  full_name: string;
  unit_number: string | null;
}

export interface MessageResponse {
  message: string;
}

export interface RegisterResidentPayload {
  name: string;
  email: string;
  id_type: string;
  id_number: string;
  address: string;
  password: string;
}

export async function login(email: string, password: string): Promise<LoginTokenResponse> {
  const body = new URLSearchParams();
  body.set("username", email);
  body.set("password", password);

  const token = await apiClient.post<LoginTokenResponse>("/api/auth/login", body);
  setAccessToken(token.access_token);
  return token;
}

export async function fetchMe(): Promise<AuthMeResponse> {
  return apiClient.get<AuthMeResponse>("/api/auth/me");
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post<MessageResponse>("/api/auth/logout", null);
  } finally {
    clearAccessToken();
  }
}

export async function registerResident(payload: RegisterResidentPayload): Promise<MessageResponse> {
  return apiClient.post<MessageResponse>("/api/auth/register/resident", payload);
}

export async function forgotPassword(email: string): Promise<MessageResponse> {
  return apiClient.post<MessageResponse>("/api/auth/forgot-password", { email });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<MessageResponse> {
  return apiClient.post<MessageResponse>("/api/auth/change-password", {
    current_password: currentPassword,
    new_password: newPassword,
  });
}
