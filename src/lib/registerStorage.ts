export type RegisterRole = "homeowner" | "tenant";

export interface RegisterData {
  role: RegisterRole | "";
  fullName: string;
  idNumber: string;
  idType: string;
  email: string;
  unit: string;
}

const STORAGE_KEY = "townsync_register_data";

export const emptyRegisterData = (): RegisterData => ({
  role: "",
  fullName: "",
  idNumber: "",
  idType: "National ID",
  email: "",
  unit: "",
});

export function getRegisterData(): RegisterData {
  if (typeof window === "undefined") {
    return emptyRegisterData();
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return emptyRegisterData();
    }
    return { ...emptyRegisterData(), ...JSON.parse(raw) };
  } catch {
    return emptyRegisterData();
  }
}

export function saveRegisterData(data: Partial<RegisterData>): RegisterData {
  const next = { ...getRegisterData(), ...data };

  if (typeof window !== "undefined") {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return next;
}

export function clearRegisterData(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}
