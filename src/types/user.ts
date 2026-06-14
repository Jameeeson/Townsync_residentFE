export type UserRole = "admin" | "resident" | "security" | "maintenance";

export type UserStatus = "pending" | "active" | "inactive" | "suspended";

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  phone_number: string | null;
  apartment_number: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthSession {
  access_token: string;
  token_type: "bearer";
  expires_at: string | null;
  user: User;
}