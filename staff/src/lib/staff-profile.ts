export type StaffProfile = {
  id: string;
  firstName: string;
  displayName: string;
  initials: string;
  role: string;
  block: string;
  shiftId: string;
};

/** Single source of truth for mock staff identity across the portal UI. */
export const STAFF_PROFILE: StaffProfile = {
  id: "emp-8842",
  firstName: "James",
  displayName: "James Rivera",
  initials: "JR",
  role: "Security Officer",
  block: "Block B",
  shiftId: "TC-8842-A",
};
