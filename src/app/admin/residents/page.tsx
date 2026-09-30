"use client";

import React, { useEffect, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "../../../lib/api";
import { useToast } from "@/components/ui/toast";
import {
  Users,
  UserCheck,
  ShieldCheck,
  Search,
  UserPlus,
  Plus,
  MoreVertical,
  ArrowLeft,
  X,
  Info,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

import {
  ACCEPTED_DOC_TYPES,
  DOC_TYPE_LABELS,
  uploadResidentDocument,
  validateDocFile,
  type ResidentDocType,
  type ResidentDocument,
} from "../../../lib/resident-documents";
import AdminShell from "../../../components/admin/admin-shell";
import styles from "../../../components/styles/Resident.module.css";

// --- Types ---
type TabType = "residents" | "users" | "security";

type ResidentApiRecord = {
  id: number;
  username: string;
  full_name: string | null;
  unit_number: string | null;
  status: "Pending" | "Active" | "Rejected" | "Suspended";
  created_at: string;
  role: string;
  phone_number: string | null;
  move_in_date: string | null;
  occupancy_type: string | null;
};

type Resident = {
  id: number;
  unit: string;
  initials: string;
  avatarColor: string;
  name: string;
  email: string;
  status: "Pending" | "Active" | "Rejected" | "Suspended";
  phoneNumber: string | null;
  moveInDate: string | null;
  occupancyType: string | null;
};

const AVATAR_COLORS = ["#93c5fd", "#a7f3d0", "#cbd5e1", "#fbcfe8", "#fde68a"];

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

type StaffUser = {
  user_id: number;
  email: string;
  status: "Pending" | "Active" | "Rejected" | "Suspended";
  created_at: string;
  role: string;
  full_name: string | null;
  employee_id: string | null;
};

type AccessGroup = {
  id: number;
  name: string;
  description: string | null;
  permissions: string[];
  assigned_users: number;
};

type PermissionInfo = { key: string; label: string; description: string };
type GroupMember = { user_id: number; email: string; status: string };

export default function DirectoryAndUserManagementPage() {
  const { toast, toastError } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("residents");

  // View & Modal States
  const [isAddingResident, setIsAddingResident] = useState(false);
  const [showAddAccessGroupModal, setShowAddAccessGroupModal] = useState(false);

  // Add Resident form state — wired to POST /api/v1/admin/residents/onboard.
  // Document is uploaded to POST /api/v1/admin/residents/upload-documents right after onboarding.
  const [onboardFullName, setOnboardFullName] = useState("");
  const [onboardEmail, setOnboardEmail] = useState("");
  const [onboardPhone, setOnboardPhone] = useState("");
  const [onboardMoveInDate, setOnboardMoveInDate] = useState("");
  const [onboardUnitNumber, setOnboardUnitNumber] = useState("");
  const [onboardOccupancy, setOnboardOccupancy] = useState<"Homeowner" | "Tenant">("Homeowner");
  const [onboardDocFile, setOnboardDocFile] = useState<File | null>(null);
  const [onboardDocType, setOnboardDocType] = useState<ResidentDocType>("Lease");
  const [onboardSubmitting, setOnboardSubmitting] = useState(false);
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [onboardResult, setOnboardResult] = useState<string | null>(null);

  const resetOnboardForm = () => {
    setOnboardFullName("");
    setOnboardEmail("");
    setOnboardPhone("");
    setOnboardMoveInDate("");
    setOnboardUnitNumber("");
    setOnboardOccupancy("Homeowner");
    setOnboardDocFile(null);
    setOnboardDocType("Lease");
    setOnboardError(null);
    setOnboardResult(null);
  };

  const submitOnboardResident = async (isDraft: boolean) => {
    const trimmedName = onboardFullName.trim();
    if (!trimmedName || !onboardEmail || !onboardUnitNumber) {
      setOnboardError("Full name, email, and unit number are required.");
      return;
    }
    const [firstName, ...rest] = trimmedName.split(/\s+/);
    const lastName = rest.join(" ");
    if (onboardDocFile) {
      const fileError = validateDocFile(onboardDocFile);
      if (fileError) {
        setOnboardError(fileError);
        return;
      }
    }
    setOnboardSubmitting(true);
    setOnboardError(null);
    try {
      const res = await apiPost<{ status: string; user_id: number; temporary_password: string }>(
        "/api/v1/admin/residents/onboard",
        {
          first_name: firstName,
          last_name: lastName,
          email: onboardEmail,
          unit_number: onboardUnitNumber,
          occupancy_type: onboardOccupancy,
          phone_number: onboardPhone || null,
          move_in_date: onboardMoveInDate || null,
          is_draft: isDraft,
        },
      );
      let uploadNote = "";
      if (onboardDocFile) {
        try {
          await uploadResidentDocument(res.user_id, onboardDocType, onboardDocFile);
          uploadNote = " Document uploaded.";
        } catch (uploadErr) {
          uploadNote = ` Resident created, but the document upload failed: ${
            uploadErr instanceof Error ? uploadErr.message : "unknown error"
          }`;
        }
      }
      setOnboardResult(
        (isDraft
          ? `Saved as draft (Pending). Temporary password: ${res.temporary_password}`
          : "Resident onboarded and set to Active. Welcome email sent.") + uploadNote,
      );
      toast(
        isDraft
          ? `${onboardEmail} saved as a pending draft.`
          : `${onboardEmail} onboarded and set to Active.`,
        "success",
      );
      loadResidents();
      if (!isDraft) {
        setTimeout(() => {
          resetOnboardForm();
          setIsAddingResident(false);
        }, 1800);
      }
    } catch (err) {
      setOnboardError(err instanceof Error ? err.message : "Failed to onboard resident");
    } finally {
      setOnboardSubmitting(false);
    }
  };

  // Global Security Settings State
  const [twoFactor, setTwoFactor] = useState(true);
  const [autoLogout, setAutoLogout] = useState(true);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(30);
  const [securityLoaded, setSecurityLoaded] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab !== "security") return;
    apiGet<{ two_factor_mandatory: boolean; session_timeout_minutes: number }>(
      "/api/v1/admin/security/global-settings",
    )
      .then((settings) => {
        setTwoFactor(settings.two_factor_mandatory);
        setAutoLogout(settings.session_timeout_minutes > 0);
        setSessionTimeoutMinutes(settings.session_timeout_minutes || 30);
        setSecurityLoaded(true);
      })
      .catch((err) => {
        setSecurityLoaded(false);
        setSecurityError(
          err instanceof Error
            ? `Backend error loading security settings: ${err.message}`
            : "Backend error loading security settings.",
        );
      });
  }, [activeTab]);

  const updateSecuritySettings = async (next: { twoFactor?: boolean; autoLogout?: boolean }) => {
    if (!securityLoaded) return;
    const nextTwoFactor = next.twoFactor ?? twoFactor;
    const nextAutoLogout = next.autoLogout ?? autoLogout;
    const previousTwoFactor = twoFactor;
    const previousAutoLogout = autoLogout;
    setTwoFactor(nextTwoFactor);
    setAutoLogout(nextAutoLogout);
    try {
      await apiPut("/api/v1/admin/security/global-settings", {
        two_factor_mandatory: nextTwoFactor,
        session_timeout_minutes: nextAutoLogout ? sessionTimeoutMinutes : 0,
      });
      setSecurityError(null);
      toast("Security settings saved.", "success");
    } catch (err) {
      setTwoFactor(previousTwoFactor);
      setAutoLogout(previousAutoLogout);
      toastError(err, "Could not save the security settings.");
      setSecurityError(
        err instanceof Error ? `Backend error saving security settings: ${err.message}` : "Backend error saving security settings.",
      );
    }
  };

  const [residents, setResidents] = useState<Resident[]>([]);
  const [residentSearch, setResidentSearch] = useState("");
  const [residentsError, setResidentsError] = useState<string | null>(null);
  const [residentMenuOpenId, setResidentMenuOpenId] = useState<number | null>(null);
  const [residentBusyId, setResidentBusyId] = useState<number | null>(null);
  const [viewingResident, setViewingResident] = useState<Resident | null>(null);

  const [docsState, setDocsState] = useState<{
    residentId: number;
    docs: ResidentDocument[] | null;
    error: string | null;
  } | null>(null);
  const viewingResidentId = viewingResident?.id ?? null;
  const currentDocs = docsState && docsState.residentId === viewingResidentId ? docsState : null;
  const residentDocs = currentDocs?.docs ?? null;
  const residentDocsError = currentDocs?.error ?? null;

  useEffect(() => {
    if (viewingResidentId === null) return;
    let cancelled = false;
    apiGet<ResidentDocument[]>(`/api/v1/admin/residents/${viewingResidentId}/documents`)
      .then((docs) => {
        if (!cancelled) setDocsState({ residentId: viewingResidentId, docs, error: null });
      })
      .catch((err) => {
        if (!cancelled)
          setDocsState({
            residentId: viewingResidentId,
            docs: null,
            error: err instanceof Error ? err.message : "Failed to load documents",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [viewingResidentId]);

  const loadResidents = () => {
    const query = residentSearch ? `?search=${encodeURIComponent(residentSearch)}` : "";
    apiGet<ResidentApiRecord[]>(`/api/v1/admin/residents/${query}`)
      .then((data) =>
        setResidents(
          data.map((item, index) => ({
            id: item.id,
            unit: item.unit_number ?? "—",
            initials: initialsFor(item.full_name ?? item.username),
            avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
            name: item.full_name ?? item.username,
            email: item.username,
            status: item.status,
            phoneNumber: item.phone_number,
            moveInDate: item.move_in_date,
            occupancyType: item.occupancy_type,
          })),
        ),
      )
      .catch((err) => setResidentsError(err instanceof Error ? err.message : "Failed to load residents"));
  };

  useEffect(() => {
    if (activeTab !== "residents") return;
    loadResidents();
  }, [activeTab, residentSearch]);

  const handleResidentStatusChange = async (residentId: number, nextStatus: "Active" | "Suspended") => {
    setResidentBusyId(residentId);
    setResidentMenuOpenId(null);
    try {
      await apiPatch(`/api/v1/admin/residents/${residentId}/status`, { status: nextStatus });
      toast(`Resident set to ${nextStatus}.`, nextStatus === "Active" ? "success" : "warning");
      loadResidents();
    } catch (err) {
      toastError(err, "Could not update the resident's status.");
      setResidentsError(err instanceof Error ? err.message : `Failed to update resident status`);
    } finally {
      setResidentBusyId(null);
    }
  };

  // System Users & Roles: lists every non-resident account (Admin/Staff/Maintenance) via
  // GET /api/v1/admin/staff/, with inline Approve/Reject for rows still Pending.
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [staffSearch, setStaffSearch] = useState("");
  const [staffError, setStaffError] = useState<string | null>(null);
  const [staffBusyId, setStaffBusyId] = useState<number | null>(null);

  const loadStaffUsers = () => {
    const query = staffSearch ? `?search=${encodeURIComponent(staffSearch)}` : "";
    apiGet<StaffUser[]>(`/api/v1/admin/staff/${query}`)
      .then(setStaffUsers)
      .catch((err) => setStaffError(err instanceof Error ? err.message : "Failed to load staff directory"));
  };

  useEffect(() => {
    if (activeTab !== "users") return;
    loadStaffUsers();
  }, [activeTab, staffSearch]);

  const handleUserDecision = async (userId: number, action: "approve" | "reject") => {
    setStaffBusyId(userId);
    setStaffError(null);
    try {
      await apiPost(`/api/v1/admin/approvals/${userId}/${action}`);
      toast(
        action === "approve" ? "Account approved." : "Account rejected.",
        action === "approve" ? "success" : "info",
      );
      loadStaffUsers();
      setViewingStaffUser((prev) =>
        prev && prev.user_id === userId
          ? { ...prev, status: action === "approve" ? "Active" : "Rejected" }
          : prev,
      );
    } catch (err) {
      toastError(err, `Could not ${action} this account.`);
      setStaffError(err instanceof Error ? err.message : `Failed to ${action} user`);
    } finally {
      setStaffBusyId(null);
    }
  };

  // Register Staff form state — wired to POST /api/v1/admin/staff/.
  const [showRegisterStaff, setShowRegisterStaff] = useState(false);
  const [registerFullName, setRegisterFullName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerEmployeeId, setRegisterEmployeeId] = useState("");
  const [registerStaffType, setRegisterStaffType] = useState<"Admin" | "Staff" | "Maintenance">("Staff");
  const [registerSpecialization, setRegisterSpecialization] = useState("");
  const [registerShift, setRegisterShift] = useState("");
  const [registerSubmitting, setRegisterSubmitting] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerResult, setRegisterResult] = useState<string | null>(null);

  const resetRegisterForm = () => {
    setRegisterFullName("");
    setRegisterEmail("");
    setRegisterEmployeeId("");
    setRegisterStaffType("Staff");
    setRegisterSpecialization("");
    setRegisterShift("");
    setRegisterError(null);
    setRegisterResult(null);
  };

  const submitRegisterStaff = async (isDraft: boolean) => {
    if (!registerFullName.trim() || !registerEmail || !registerEmployeeId.trim()) {
      setRegisterError("Full name, email, and employee ID are required.");
      return;
    }
    setRegisterSubmitting(true);
    setRegisterError(null);
    try {
      const res = await apiPost<{ status: string; user_id: number; temporary_password: string }>(
        "/api/v1/admin/staff/",
        {
          full_name: registerFullName.trim(),
          email: registerEmail,
          employee_id: registerEmployeeId.trim(),
          staff_type: registerStaffType,
          specialization: registerSpecialization || null,
          shift: registerShift || null,
          is_draft: isDraft,
        },
      );
      setRegisterResult(
        isDraft
          ? `Saved as draft (Pending). Temporary password: ${res.temporary_password}`
          : "Staff account created and set to Active. Welcome email sent.",
      );
      toast(
        isDraft
          ? `${registerEmail} saved as a pending draft.`
          : `${registerEmail} created and set to Active.`,
        "success",
      );
      loadStaffUsers();
      if (!isDraft) {
        setTimeout(() => {
          resetRegisterForm();
          setShowRegisterStaff(false);
        }, 1800);
      }
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : "Failed to register staff account");
    } finally {
      setRegisterSubmitting(false);
    }
  };

  const [staffMenuOpenId, setStaffMenuOpenId] = useState<number | null>(null);
  const [viewingStaffUser, setViewingStaffUser] = useState<StaffUser | null>(null);
  const [editingStaffUser, setEditingStaffUser] = useState<StaffUser | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmployeeId, setEditEmployeeId] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const openEditStaffUser = (user: StaffUser) => {
    setStaffMenuOpenId(null);
    setEditingStaffUser(user);
    setEditFullName(user.full_name ?? "");
    setEditEmployeeId(user.employee_id ?? "");
    setEditError(null);
  };

  const submitEditStaffUser = async () => {
    if (!editingStaffUser) return;
    setEditSubmitting(true);
    setEditError(null);
    try {
      await apiPatch(`/api/v1/admin/staff/${editingStaffUser.user_id}`, {
        full_name: editFullName,
        employee_id: editEmployeeId,
      });
      toast(`${editFullName || editingStaffUser.email} updated.`, "success");
      setViewingStaffUser((prev) =>
        prev && prev.user_id === editingStaffUser.user_id
          ? { ...prev, full_name: editFullName, employee_id: editEmployeeId }
          : prev,
      );
      setEditingStaffUser(null);
      loadStaffUsers();
    } catch (err) {
      toastError(err, "Could not update this staff account.");
      setEditError(err instanceof Error ? err.message : "Failed to update staff account");
    } finally {
      setEditSubmitting(false);
    }
  };

  const [resettingPasswordUser, setResettingPasswordUser] = useState<StaffUser | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const openResetPassword = (user: StaffUser) => {
    setStaffMenuOpenId(null);
    setResettingPasswordUser(user);
    setResetNewPassword("");
    setResetConfirmPassword("");
    setResetError(null);
  };

  const submitResetPassword = async () => {
    if (!resettingPasswordUser) return;
    if (resetNewPassword.length < 8) {
      setResetError("Password must be at least 8 characters.");
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setResetError("Passwords do not match.");
      return;
    }
    setResetSubmitting(true);
    setResetError(null);
    try {
      await apiPost(`/api/v1/admin/staff/${resettingPasswordUser.user_id}/reset-password`, {
        new_password: resetNewPassword,
      });
      toast(
        `Password reset for ${resettingPasswordUser.full_name ?? resettingPasswordUser.email}.`,
        "success",
      );
      setResettingPasswordUser(null);
    } catch (err) {
      toastError(err, "Could not reset the password.");
      setResetError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleDeleteStaffUser = async (user: StaffUser) => {
    setStaffMenuOpenId(null);
    if (!window.confirm(`Permanently delete ${user.full_name ?? user.email}'s account? This cannot be undone.`)) {
      return;
    }
    setStaffBusyId(user.user_id);
    setStaffError(null);
    try {
      await apiDelete(`/api/v1/admin/staff/${user.user_id}`);
      toast(`${user.full_name ?? user.email} deleted.`, "success");
      setViewingStaffUser((prev) => (prev && prev.user_id === user.user_id ? null : prev));
      loadStaffUsers();
    } catch (err) {
      toastError(err, "Could not delete this staff account.");
      setStaffError(err instanceof Error ? err.message : "Failed to delete staff account");
    } finally {
      setStaffBusyId(null);
    }
  };

  // Access Groups: real CRUD via /api/v1/admin/access-groups. Permissions are stored per
  // group; they are a record only and are not yet enforced by other endpoints.
  const [accessGroups, setAccessGroups] = useState<AccessGroup[]>([]);
  const [groupSearch, setGroupSearch] = useState("");
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [permissionCatalog, setPermissionCatalog] = useState<PermissionInfo[]>([]);
  const [editingGroup, setEditingGroup] = useState<AccessGroup | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupPermissions, setGroupPermissions] = useState<string[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [memberCandidates, setMemberCandidates] = useState<StaffUser[]>([]);
  const [memberToAdd, setMemberToAdd] = useState("");
  const [groupSubmitting, setGroupSubmitting] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [groupMenuOpenId, setGroupMenuOpenId] = useState<number | null>(null);

  const loadAccessGroups = () => {
    const query = groupSearch ? `?search=${encodeURIComponent(groupSearch)}` : "";
    apiGet<AccessGroup[]>(`/api/v1/admin/access-groups/${query}`)
      .then((data) => {
        setAccessGroups(data);
        setGroupsError(null);
      })
      .catch((err) => setGroupsError(err instanceof Error ? err.message : "Failed to load access groups"));
  };

  useEffect(() => {
    if (activeTab !== "security") return;
    loadAccessGroups();
  }, [activeTab, groupSearch]);

  useEffect(() => {
    if (!showAddAccessGroupModal || permissionCatalog.length > 0) return;
    apiGet<PermissionInfo[]>("/api/v1/admin/access-groups/permissions")
      .then(setPermissionCatalog)
      .catch((err) => setGroupError(err instanceof Error ? err.message : "Failed to load permissions"));
  }, [showAddAccessGroupModal, permissionCatalog.length]);

  const loadGroupMembers = (groupId: number) => {
    apiGet<GroupMember[]>(`/api/v1/admin/access-groups/${groupId}/members`)
      .then(setGroupMembers)
      .catch((err) => setGroupError(err instanceof Error ? err.message : "Failed to load members"));
  };

  const openGroupModal = (group: AccessGroup | null) => {
    setGroupMenuOpenId(null);
    setEditingGroup(group);
    setGroupName(group?.name ?? "");
    setGroupDescription(group?.description ?? "");
    setGroupPermissions(group?.permissions ?? []);
    setGroupMembers([]);
    setMemberToAdd("");
    setGroupError(null);
    setShowAddAccessGroupModal(true);
    if (group) {
      loadGroupMembers(group.id);
      apiGet<StaffUser[]>("/api/v1/admin/staff/")
        .then(setMemberCandidates)
        .catch(() => setMemberCandidates([]));
    }
  };

  const closeGroupModal = () => {
    setShowAddAccessGroupModal(false);
    setEditingGroup(null);
  };

  const submitAccessGroup = async () => {
    if (!groupName.trim()) {
      setGroupError("Group name is required.");
      return;
    }
    setGroupSubmitting(true);
    setGroupError(null);
    try {
      const body = { name: groupName.trim(), description: groupDescription.trim(), permissions: groupPermissions };
      if (editingGroup) {
        await apiPatch(`/api/v1/admin/access-groups/${editingGroup.id}`, body);
      } else {
        await apiPost("/api/v1/admin/access-groups/", body);
      }
      toast(
        editingGroup
          ? `Access group "${body.name}" updated.`
          : `Access group "${body.name}" created.`,
        "success",
      );
      closeGroupModal();
      loadAccessGroups();
    } catch (err) {
      toastError(err, "Could not save the access group.");
      setGroupError(err instanceof Error ? err.message : "Failed to save access group");
    } finally {
      setGroupSubmitting(false);
    }
  };

  const handleDeleteAccessGroup = async (group: AccessGroup) => {
    setGroupMenuOpenId(null);
    if (!window.confirm(`Delete access group "${group.name}"? Its member assignments will be removed.`)) return;
    try {
      await apiDelete(`/api/v1/admin/access-groups/${group.id}`);
      toast(`Access group "${group.name}" deleted.`, "success");
      loadAccessGroups();
    } catch (err) {
      toastError(err, "Could not delete the access group.");
      setGroupsError(err instanceof Error ? err.message : "Failed to delete access group");
    }
  };

  const addGroupMember = async () => {
    if (!editingGroup || !memberToAdd) return;
    setGroupError(null);
    try {
      await apiPost(`/api/v1/admin/access-groups/${editingGroup.id}/members`, { user_ids: [Number(memberToAdd)] });
      toast(`Member added to "${editingGroup.name}".`, "success");
      setMemberToAdd("");
      loadGroupMembers(editingGroup.id);
      loadAccessGroups();
    } catch (err) {
      toastError(err, "Could not add that member.");
      setGroupError(err instanceof Error ? err.message : "Failed to add member");
    }
  };

  const removeGroupMember = async (userId: number) => {
    if (!editingGroup) return;
    setGroupError(null);
    try {
      await apiDelete(`/api/v1/admin/access-groups/${editingGroup.id}/members/${userId}`);
      toast(`Member removed from "${editingGroup.name}".`, "success");
      loadGroupMembers(editingGroup.id);
      loadAccessGroups();
    } catch (err) {
      toastError(err, "Could not remove that member.");
      setGroupError(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  // --- FULL PAGE: Resident Detail View ---
  if (viewingResident) {
    const resident = viewingResident;
    return (
      <AdminShell>
        <div className={styles.container}>
          <button type="button" className={styles.backBtn} onClick={() => setViewingResident(null)}>
            <ArrowLeft size={16} /> Back
          </button>

          <header className={styles.header}>
            <h1>Resident Profile</h1>
            <p>{resident.unit}</p>
          </header>

          {residentsError ? <p className={styles.subText}>{residentsError}</p> : null}

          <div className={styles.card} style={{ padding: "1.5rem" }}>
            <div className={styles.previewHeader}>
              <span className={styles.avatar} style={{ backgroundColor: resident.avatarColor, width: 48, height: 48, fontSize: "1.1rem" }}>
                {resident.initials}
              </span>
              <div className={styles.previewDetails}>
                <h4>{resident.name}</h4>
                <span
                  className={`${styles.badge} ${
                    resident.status === "Active"
                      ? styles.badgeGreen
                      : resident.status === "Pending"
                      ? styles.badgeOrange
                      : styles.badgeGray
                  }`}
                >
                  {resident.status}
                </span>
              </div>
            </div>

            <div className={styles.formGrid2} style={{ marginTop: "1.5rem" }}>
              <div className={styles.previewMetaRow}>
                <label>Unit</label>
                <span>{resident.unit}</span>
              </div>
              <div className={styles.previewMetaRow}>
                <label>Email</label>
                <span>{resident.email}</span>
              </div>
              <div className={styles.previewMetaRow}>
                <label>Phone</label>
                <span>{resident.phoneNumber || "Not provided"}</span>
              </div>
              <div className={styles.previewMetaRow}>
                <label>Move-in Date</label>
                <span>{resident.moveInDate || "Not provided"}</span>
              </div>
              <div className={styles.previewMetaRow}>
                <label>Occupancy Type</label>
                <span>{resident.occupancyType || "Not provided"}</span>
              </div>
              <div className={styles.previewMetaRow}>
                <label>Documents</label>
                <span>
                  {residentDocsError
                    ? residentDocsError
                    : residentDocs === null
                    ? "Loading…"
                    : residentDocs.length === 0
                    ? "No documents uploaded"
                    : residentDocs
                        .map((d) => `${d.doc_type ? DOC_TYPE_LABELS[d.doc_type] : "Document"}: ${d.display_name}`)
                        .join(", ")}
                </span>
              </div>
            </div>

            <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem" }}>
              {resident.status === "Pending" ? (
                <button
                  type="button"
                  className={styles.primaryBtn}
                  disabled={residentBusyId === resident.id}
                  onClick={async () => {
                    await handleResidentStatusChange(resident.id, "Active");
                    setViewingResident({ ...resident, status: "Active" });
                  }}
                >
                  Approve Account
                </button>
              ) : resident.status === "Suspended" ? (
                <button
                  type="button"
                  className={styles.primaryBtn}
                  disabled={residentBusyId === resident.id}
                  onClick={async () => {
                    await handleResidentStatusChange(resident.id, "Active");
                    setViewingResident({ ...resident, status: "Active" });
                  }}
                >
                  Reactivate Resident
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.secondaryOutlineBtn}
                  disabled={residentBusyId === resident.id}
                  onClick={async () => {
                    await handleResidentStatusChange(resident.id, "Suspended");
                    setViewingResident({ ...resident, status: "Suspended" });
                  }}
                >
                  Suspend Resident
                </button>
              )}
            </div>
          </div>
        </div>
      </AdminShell>
    );
  }

  // --- FULL PAGE: Add Resident Form View (Picture 1) ---
  if (isAddingResident) {
    return (
      <AdminShell>
        <div className={styles.container}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => {
              resetOnboardForm();
              setIsAddingResident(false);
            }}
          >
            <ArrowLeft size={16} /> Back
          </button>

          <header className={styles.header}>
            <h1>Add Resident</h1>
            <p>Onboard a new member to the TownhousePro community.</p>
          </header>

          <div className={styles.addResidentLayout}>
            {/* Left Column Forms */}
            <div className={styles.leftColumn}>
              {/* Personal Information */}
              <div className={styles.formCard}>
                <h3 className={styles.cardSectionTitle}>👤 Personal Information</h3>
                <div className={styles.formGrid2}>
                  <div className={styles.formGroup}>
                    <label>Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Jonathan Doe"
                      value={onboardFullName}
                      onChange={(e) => setOnboardFullName(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Email Address</label>
                    <input
                      type="email"
                      placeholder="j.doe@example.com"
                      value={onboardEmail}
                      onChange={(e) => setOnboardEmail(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Phone Number</label>
                    <input
                      type="text"
                      placeholder="+1 (555) 000-0000"
                      value={onboardPhone}
                      onChange={(e) => setOnboardPhone(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Move-in Date</label>
                    <input
                      type="date"
                      value={onboardMoveInDate}
                      onChange={(e) => setOnboardMoveInDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Unit Assignment */}
              <div className={styles.formCard}>
                <h3 className={styles.cardSectionTitle}>🏠 Unit Assignment</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className={styles.formGroup}>
                    <label>Lot / Unit Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 104"
                      value={onboardUnitNumber}
                      onChange={(e) => setOnboardUnitNumber(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Occupancy Type</label>
                    <div className={styles.occupancySegment}>
                      <button
                        type="button"
                        className={onboardOccupancy === "Homeowner" ? `${styles.occupancyBtn} ${styles.occupancyBtnActive}` : styles.occupancyBtn}
                        onClick={() => setOnboardOccupancy("Homeowner")}
                      >
                        Owner
                      </button>
                      <button
                        type="button"
                        className={onboardOccupancy === "Tenant" ? `${styles.occupancyBtn} ${styles.occupancyBtnActive}` : styles.occupancyBtn}
                        onClick={() => setOnboardOccupancy("Tenant")}
                      >
                        Tenant
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Documents Dropzone */}
              <div className={styles.formCard}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h3 className={styles.cardSectionTitle} style={{ margin: 0 }}>📄 Documents</h3>
                  <span style={{ fontSize: "0.75rem", color: "#5b6b82" }}>Required: Lease or Ownership Deed</span>
                </div>
                <div className={styles.formGroup}>
                  <label>Document Type</label>
                  <select
                    value={onboardDocType}
                    onChange={(e) => setOnboardDocType(e.target.value as ResidentDocType)}
                  >
                    {(Object.keys(DOC_TYPE_LABELS) as ResidentDocType[]).map((t) => (
                      <option key={t} value={t}>
                        {DOC_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <label className={styles.dropzone} style={{ cursor: "pointer" }}>
                  <div className={styles.dropzoneIcon}>
                    <UploadCloud size={24} />
                  </div>
                  <div className={styles.dropzoneText}>
                    {onboardDocFile ? onboardDocFile.name : "Click to choose a file"}
                  </div>
                  <div className={styles.dropzoneSub}>
                    PDF, PNG, or JPG (max. 10MB). Uploaded right after the account is created.
                  </div>
                  <input
                    type="file"
                    accept={ACCEPTED_DOC_TYPES}
                    style={{ display: "none" }}
                    onChange={(e) => setOnboardDocFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            </div>

            {/* Right Column Preview */}
            <div className={styles.rightColumn}>
              <div className={styles.previewCard}>
                <div className={styles.previewTag}>PREVIEW CARD</div>
                <div className={styles.previewHeader}>
                  <div className={styles.previewAvatar}>
                    <FileText size={24} />
                  </div>
                  <div className={styles.previewDetails}>
                    <h4>{onboardFullName || "New Resident"}</h4>
                    <span className={styles.badgeVerification}>PENDING VERIFICATION</span>
                  </div>
                </div>
                <div className={styles.previewMetaRow}>
                  <label>Unit</label>
                  <span>{onboardUnitNumber || "Not assigned"}</span>
                </div>
                <div className={styles.previewMetaRow}>
                  <label>Status</label>
                  <span>In-processing</span>
                </div>
              </div>

              {onboardError ? (
                <div className={`${styles.formBanner} ${styles.formBannerError}`}>
                  <AlertCircle size={16} /> {onboardError}
                </div>
              ) : null}
              {onboardResult ? (
                <div className={`${styles.formBanner} ${styles.formBannerSuccess}`}>
                  <CheckCircle2 size={16} /> {onboardResult}
                  {onboardResult.startsWith("Resident onboarded") ? " Returning to the resident list…" : ""}
                </div>
              ) : null}

              <button
                type="button"
                className={styles.completeBtn}
                disabled={onboardSubmitting}
                onClick={() => submitOnboardResident(false)}
              >
                <UserPlus size={16} /> {onboardSubmitting ? "Submitting..." : "Complete Onboarding"}
              </button>
              <button
                type="button"
                className={styles.draftBtn}
                disabled={onboardSubmitting}
                onClick={() => submitOnboardResident(true)}
              >
                Save as Draft
              </button>

              <div style={{ fontSize: "0.725rem", color: "#5b6b82", textAlign: "center", lineHeight: "1.4" }}>
                By clicking &quot;Complete Onboarding&quot;, an automated welcome email with login credentials will be sent to the resident.
              </div>

              <div className={styles.helpBox}>
                <div className={styles.helpHeader}>
                  <Info size={16} /> Need help?
                </div>
                <p className={styles.helpText}>
                  Ensure you have the valid occupancy documents before proceeding. Residents without documents cannot be verified for voting rights.
                </p>
              </div>
            </div>
          </div>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className={styles.container}>
        {/* Header Section */}
        <header className={styles.header}>
          <h1>Directory & User Management</h1>
          <p>Manage residents, system access, and security policies.</p>
        </header>

        {/* Main Card Layout */}
        <div className={styles.card}>
          {/* Navigation Tabs */}
          <nav className={styles.tabsNav}>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === "residents" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("residents")}
            >
              <Users size={18} />
              Resident Management
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === "users" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("users")}
            >
              <UserCheck size={18} />
              System Users & Roles
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === "security" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("security")}
            >
              <ShieldCheck size={18} />
              Security & Access Control
            </button>
          </nav>

          {/* --- TAB 1: Resident Management --- */}
          {activeTab === "residents" && (
            <div className={styles.tabContent}>
              <div className={styles.toolbar}>
                <div className={styles.toolbarLeft}>
                  <div className={styles.searchBox}>
                    <Search size={16} className={styles.searchIcon} />
                    <input
                      type="text"
                      placeholder="Search name or unit..."
                      value={residentSearch}
                      onChange={(e) => setResidentSearch(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={() => {
                    resetOnboardForm();
                    setIsAddingResident(true);
                  }}
                >
                  <UserPlus size={16} /> Add Resident
                </button>
              </div>

              {residentsError ? <p className={styles.subText}>{residentsError}</p> : null}

              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>UNIT</th>
                      <th>NAME</th>
                      <th>EMAIL</th>
                      <th>STATUS</th>
                      <th className={styles.textRight}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {residents.length === 0 ? (
                      <tr>
                        <td colSpan={5}>No residents found.</td>
                      </tr>
                    ) : (
                      residents.map((item) => (
                        <tr
                          key={item.id}
                          className={styles.clickableRow}
                          onClick={() => setViewingResident(item)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") setViewingResident(item);
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <td className={styles.unitCell}>{item.unit}</td>
                          <td>
                            <div className={styles.userCell}>
                              <span
                                className={styles.avatar}
                                style={{ backgroundColor: item.avatarColor }}
                              >
                                {item.initials}
                              </span>
                              <span className={styles.userName}>{item.name}</span>
                            </div>
                          </td>
                          <td>
                            <div className={styles.contactCell}>
                              <div>{item.email}</div>
                            </div>
                          </td>
                          <td>
                            <span
                              className={`${styles.badge} ${
                                item.status === "Pending"
                                  ? styles.badgeOrange
                                  : item.status === "Active"
                                  ? styles.badgeGreen
                                  : styles.badgeGray
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td
                            className={styles.textRight}
                            style={{ position: "relative" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {item.status === "Pending" ? (
                              <div className={styles.groupActions}>
                                <button
                                  type="button"
                                  className={styles.secondaryOutlineBtn}
                                  disabled={residentBusyId === item.id}
                                  onClick={() => handleResidentStatusChange(item.id, "Active")}
                                >
                                  Approve
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className={styles.actionBtn}
                                  disabled={residentBusyId === item.id}
                                  onClick={() =>
                                    setResidentMenuOpenId(residentMenuOpenId === item.id ? null : item.id)
                                  }
                                >
                                  <MoreVertical size={18} />
                                </button>
                                {residentMenuOpenId === item.id ? (
                                  <div className={styles.dropdownMenu}>
                                    {item.status === "Suspended" ? (
                                      <button
                                        type="button"
                                        onClick={() => handleResidentStatusChange(item.id, "Active")}
                                      >
                                        Reactivate
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleResidentStatusChange(item.id, "Suspended")}
                                      >
                                        Suspend
                                      </button>
                                    )}
                                  </div>
                                ) : null}
                              </>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- TAB 2: System Users & Roles --- */}
          {activeTab === "users" && (
            <div className={styles.tabContent}>
              <div className={styles.toolbar}>
                <div className={styles.toolbarLeft}>
                  <div className={`${styles.searchBox} ${styles.searchBoxWide}`}>
                    <Search size={16} className={styles.searchIcon} />
                    <input
                      type="text"
                      placeholder="Search name, role, or email..."
                      value={staffSearch}
                      onChange={(e) => setStaffSearch(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={() => {
                    resetRegisterForm();
                    setShowRegisterStaff(true);
                  }}
                >
                  <UserPlus size={16} /> Register Staff
                </button>
              </div>

              {staffError ? <p className={styles.subText}>{staffError}</p> : null}

              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>NAME</th>
                      <th>ROLE</th>
                      <th>EMAIL</th>
                      <th>EMPLOYEE ID</th>
                      <th>STATUS</th>
                      <th className={styles.textRight}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6}>No staff or admin accounts found.</td>
                      </tr>
                    ) : (
                      staffUsers.map((user) => (
                        <tr
                          key={user.user_id}
                          className={styles.clickableRow}
                          onClick={() => setViewingStaffUser(user)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") setViewingStaffUser(user);
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <td className={styles.userNameBold}>{user.full_name ?? "—"}</td>
                          <td>{user.role}</td>
                          <td className={styles.subTextDark}>{user.email}</td>
                          <td className={styles.subTextDark}>{user.employee_id ?? "—"}</td>
                          <td>
                            <span
                              className={`${styles.badge} ${
                                user.status === "Active"
                                  ? styles.badgeGreen
                                  : user.status === "Pending"
                                  ? styles.badgeOrange
                                  : styles.badgeGray
                              }`}
                            >
                              {user.status}
                            </span>
                          </td>
                          <td
                            className={styles.textRight}
                            style={{ position: "relative" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {user.status === "Pending" ? (
                              <div className={styles.groupActions}>
                                <button
                                  type="button"
                                  className={styles.secondaryOutlineBtn}
                                  disabled={staffBusyId === user.user_id}
                                  onClick={() => handleUserDecision(user.user_id, "approve")}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  className={styles.secondaryOutlineBtn}
                                  disabled={staffBusyId === user.user_id}
                                  onClick={() => handleUserDecision(user.user_id, "reject")}
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className={styles.actionBtn}
                                  disabled={staffBusyId === user.user_id}
                                  onClick={() =>
                                    setStaffMenuOpenId(staffMenuOpenId === user.user_id ? null : user.user_id)
                                  }
                                >
                                  <MoreVertical size={18} />
                                </button>
                                {staffMenuOpenId === user.user_id ? (
                                  <div className={styles.dropdownMenu}>
                                    <button type="button" onClick={() => openEditStaffUser(user)}>
                                      Edit
                                    </button>
                                    <button type="button" onClick={() => openResetPassword(user)}>
                                      Reset Password
                                    </button>
                                    <button type="button" onClick={() => handleDeleteStaffUser(user)}>
                                      Delete
                                    </button>
                                  </div>
                                ) : null}
                              </>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- TAB 3: Security & Access Control --- */}
          {activeTab === "security" && (
            <div className={styles.tabContent}>
              {/* Global Security Toggles */}
              <div className={styles.securitySection}>
                <h3>Global Security Settings</h3>
                {securityError ? <p className={styles.subText}>{securityError}</p> : null}
                <div className={styles.toggleGrid}>
                  <div className={styles.toggleItem}>
                    <button
                      type="button"
                      className={`${styles.toggleSwitch} ${twoFactor ? styles.toggleOn : ""}`}
                      onClick={() => updateSecuritySettings({ twoFactor: !twoFactor })}
                    >
                      <span className={styles.toggleCircle} />
                    </button>
                    <div>
                      <div className={styles.toggleTitle}>Two-Factor Authentication (2FA)</div>
                      <div className={styles.toggleSub}>
                        Require 2FA for all admin and staff accounts
                      </div>
                    </div>
                  </div>

                  <div className={styles.toggleItem}>
                    <button
                      type="button"
                      className={`${styles.toggleSwitch} ${autoLogout ? styles.toggleOn : ""}`}
                      onClick={() => updateSecuritySettings({ autoLogout: !autoLogout })}
                    >
                      <span className={styles.toggleCircle} />
                    </button>
                    <div>
                      <div className={styles.toggleTitle}>Automatic Logout</div>
                      <div className={styles.toggleSub}>
                        Automatically log out inactive users after 30 minutes
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Access Groups Directory */}
              <div className={styles.accessSection}>
                {groupsError ? <p className={styles.subText}>{groupsError}</p> : null}
                <div className={styles.toolbar}>
                  <h3>Access Groups</h3>
                  <div className={styles.toolbarRight}>
                    <div className={styles.searchBox}>
                      <Search size={16} className={styles.searchIcon} />
                      <input
                        type="text"
                        placeholder="Search access groups..."
                        value={groupSearch}
                        onChange={(e) => setGroupSearch(e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      className={styles.primaryBtn}
                      onClick={() => openGroupModal(null)}
                    >
                      <Plus size={16} /> Add Access Group
                    </button>
                  </div>
                </div>

                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>GROUP NAME</th>
                        <th>DESCRIPTION</th>
                        <th>ASSIGNED USERS</th>
                        <th className={styles.textRight}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accessGroups.length === 0 ? (
                        <tr>
                          <td colSpan={4}>No access groups yet.</td>
                        </tr>
                      ) : (
                        accessGroups.map((group) => (
                          <tr key={group.id}>
                            <td className={styles.userNameBold}>{group.name}</td>
                            <td className={styles.subTextDark}>{group.description || "—"}</td>
                            <td className={styles.subTextDark}>
                              {group.assigned_users} {group.assigned_users === 1 ? "User" : "Users"}
                            </td>
                            <td className={styles.textRight} style={{ position: "relative" }}>
                              <div className={styles.groupActions}>
                                <button
                                  type="button"
                                  className={styles.secondaryOutlineBtn}
                                  onClick={() => openGroupModal(group)}
                                >
                                  Edit Permissions
                                </button>
                                <button
                                  type="button"
                                  className={styles.actionBtn}
                                  onClick={() => setGroupMenuOpenId(groupMenuOpenId === group.id ? null : group.id)}
                                >
                                  <MoreVertical size={18} />
                                </button>
                                {groupMenuOpenId === group.id ? (
                                  <div className={styles.dropdownMenu}>
                                    <button type="button" onClick={() => handleDeleteAccessGroup(group)}>
                                      Delete
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL: Staff/Admin/Maintenance Detail View --- */}
      {viewingStaffUser && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Staff Account</h2>
                <p>{viewingStaffUser.role}</p>
              </div>
              <button type="button" className={styles.closeBtn} onClick={() => setViewingStaffUser(null)}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              {staffError ? <p className={styles.subText}>{staffError}</p> : null}
              <div className={styles.previewHeader}>
                <span
                  className={styles.avatar}
                  style={{
                    backgroundColor: AVATAR_COLORS[viewingStaffUser.user_id % AVATAR_COLORS.length],
                    width: 48,
                    height: 48,
                    fontSize: "1.1rem",
                  }}
                >
                  {initialsFor(viewingStaffUser.full_name ?? viewingStaffUser.email)}
                </span>
                <div className={styles.previewDetails}>
                  <h4>{viewingStaffUser.full_name ?? "—"}</h4>
                  <span
                    className={`${styles.badge} ${
                      viewingStaffUser.status === "Active"
                        ? styles.badgeGreen
                        : viewingStaffUser.status === "Pending"
                        ? styles.badgeOrange
                        : styles.badgeGray
                    }`}
                  >
                    {viewingStaffUser.status}
                  </span>
                </div>
              </div>

              <div className={styles.formGrid2} style={{ marginTop: "1.5rem" }}>
                <div className={styles.previewMetaRow}>
                  <label>Role</label>
                  <span>{viewingStaffUser.role}</span>
                </div>
                <div className={styles.previewMetaRow}>
                  <label>Email</label>
                  <span>{viewingStaffUser.email}</span>
                </div>
                <div className={styles.previewMetaRow}>
                  <label>Employee ID</label>
                  <span>{viewingStaffUser.employee_id || "Not provided"}</span>
                </div>
                <div className={styles.previewMetaRow}>
                  <label>Registered</label>
                  <span>{viewingStaffUser.created_at}</span>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter} style={{ flexWrap: "wrap", justifyContent: "flex-start", gap: "0.75rem" }}>
              {viewingStaffUser.status === "Pending" ? (
                <>
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    disabled={staffBusyId === viewingStaffUser.user_id}
                    onClick={() => handleUserDecision(viewingStaffUser.user_id, "approve")}
                  >
                    Approve Account
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryOutlineBtn}
                    disabled={staffBusyId === viewingStaffUser.user_id}
                    onClick={() => handleUserDecision(viewingStaffUser.user_id, "reject")}
                  >
                    Reject Account
                  </button>
                </>
              ) : null}
              <button
                type="button"
                className={styles.secondaryOutlineBtn}
                onClick={() => openEditStaffUser(viewingStaffUser)}
              >
                Edit
              </button>
              <button
                type="button"
                className={styles.secondaryOutlineBtn}
                onClick={() => openResetPassword(viewingStaffUser)}
              >
                Reset Password
              </button>
              <button
                type="button"
                className={styles.secondaryOutlineBtn}
                disabled={staffBusyId === viewingStaffUser.user_id}
                onClick={() => handleDeleteStaffUser(viewingStaffUser)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: Register Staff --- */}
      {showRegisterStaff && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Register Staff</h2>
                <p>Create a new admin, operations, or maintenance account.</p>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setShowRegisterStaff(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              {registerError ? <p className={styles.subText}>{registerError}</p> : null}
              {registerResult ? (
                <p className={styles.subText} style={{ color: "#166534" }}>
                  {registerResult}
                </p>
              ) : null}
              <div className={styles.formGroup}>
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Maria Santos"
                  value={registerFullName}
                  onChange={(e) => setRegisterFullName(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Work Email</label>
                <input
                  type="email"
                  placeholder="m.santos@townsync.local"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                />
              </div>
              <div className={styles.formGrid2}>
                <div className={styles.formGroup}>
                  <label>Employee ID</label>
                  <input
                    type="text"
                    placeholder="EMP-2026-001"
                    value={registerEmployeeId}
                    onChange={(e) => setRegisterEmployeeId(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Role</label>
                  <select
                    value={registerStaffType}
                    onChange={(e) =>
                      setRegisterStaffType(e.target.value as "Admin" | "Staff" | "Maintenance")
                    }
                  >
                    <option value="Staff">Staff (Operations)</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
              </div>
              {registerStaffType === "Maintenance" ? (
                <div className={styles.formGrid2}>
                  <div className={styles.formGroup}>
                    <label>Specialization</label>
                    <input
                      type="text"
                      placeholder="e.g. Plumbing, HVAC"
                      value={registerSpecialization}
                      onChange={(e) => setRegisterSpecialization(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Shift</label>
                    <input
                      type="text"
                      placeholder="e.g. 8AM - 4PM"
                      value={registerShift}
                      onChange={(e) => setRegisterShift(e.target.value)}
                    />
                  </div>
                </div>
              ) : null}
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelBtn}
                disabled={registerSubmitting}
                onClick={() => submitRegisterStaff(true)}
              >
                Save as Draft
              </button>
              <button
                type="button"
                className={styles.submitBtn}
                disabled={registerSubmitting}
                onClick={() => submitRegisterStaff(false)}
              >
                {registerSubmitting ? "Creating..." : "Create & Activate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: Edit Staff Account --- */}
      {editingStaffUser && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Edit Staff Account</h2>
                <p>{editingStaffUser.email}</p>
              </div>
              <button type="button" className={styles.closeBtn} onClick={() => setEditingStaffUser(null)}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              {editError ? <p className={styles.subText}>{editError}</p> : null}
              <div className={styles.formGroup}>
                <label>Full Name</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Employee ID</label>
                <input
                  type="text"
                  value={editEmployeeId}
                  onChange={(e) => setEditEmployeeId(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={() => setEditingStaffUser(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.submitBtn}
                disabled={editSubmitting}
                onClick={submitEditStaffUser}
              >
                {editSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: Reset Staff Password --- */}
      {resettingPasswordUser && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Reset Password</h2>
                <p>{resettingPasswordUser.full_name ?? resettingPasswordUser.email}</p>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setResettingPasswordUser(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              {resetError ? <p className={styles.subText}>{resetError}</p> : null}
              <div className={styles.formGroup}>
                <label>New Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showResetPassword ? "text" : "password"}
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    style={{ paddingRight: "2.5rem" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword((v) => !v)}
                    aria-label={showResetPassword ? "Hide password" : "Show password"}
                    style={{
                      position: "absolute",
                      right: "0.6rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#5b6b82",
                      display: "flex",
                    }}
                  >
                    {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Confirm New Password</label>
                <input
                  type={showResetPassword ? "text" : "password"}
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  placeholder="Re-enter the new password"
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={() => setResettingPasswordUser(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.submitBtn}
                disabled={resetSubmitting}
                onClick={submitResetPassword}
              >
                {resetSubmitting ? "Saving..." : "Reset Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: Add / Edit Access Group --- */}
      {showAddAccessGroupModal && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} ${styles.modalContentWide}`}>
            <div className={styles.modalHeader}>
              <div>
                <h2>{editingGroup ? "Edit Access Group" : "Add Access Group"}</h2>
                <p>Group permissions are recorded here; other endpoints do not enforce them yet.</p>
              </div>
              <button type="button" className={styles.closeBtn} onClick={closeGroupModal}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {groupError ? <p className={styles.subText}>{groupError}</p> : null}
              <div className={styles.formGroup}>
                <label>Group Name</label>
                <input
                  type="text"
                  maxLength={80}
                  placeholder="e.g. Vendor Access"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Group Description</label>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                />
              </div>

              <div>
                <div className={styles.permissionsTitle}>
                  <ShieldCheck size={16} /> PERMISSIONS CHECKLIST
                </div>
                <div className={styles.permissionsGrid}>
                  {permissionCatalog.map((perm) => {
                    const checked = groupPermissions.includes(perm.key);
                    return (
                      <div
                        key={perm.key}
                        className={`${styles.permissionCard} ${checked ? styles.permissionCardActive : ""}`}
                      >
                        <div className={styles.permissionMeta}>
                          <strong>{perm.label}</strong>
                          <span>{perm.description}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setGroupPermissions((prev) =>
                              checked ? prev.filter((k) => k !== perm.key) : [...prev, perm.key],
                            )
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {editingGroup ? (
                <div>
                  <div className={styles.permissionsTitle}>
                    <Users size={16} /> ASSIGNED USERS
                  </div>
                  {groupMembers.length === 0 ? (
                    <p className={styles.subText}>No users assigned to this group.</p>
                  ) : (
                    groupMembers.map((m) => (
                      <div key={m.user_id} style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0" }}>
                        <span>{m.email}</span>
                        <button type="button" className={styles.cancelBtn} onClick={() => removeGroupMember(m.user_id)}>
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                    <select value={memberToAdd} onChange={(e) => setMemberToAdd(e.target.value)} style={{ flex: 1 }}>
                      <option value="">Select a staff or admin account…</option>
                      {memberCandidates
                        .filter((u) => !groupMembers.some((m) => m.user_id === u.user_id))
                        .map((u) => (
                          <option key={u.user_id} value={u.user_id}>
                            {u.full_name ?? u.email} ({u.role})
                          </option>
                        ))}
                    </select>
                    <button type="button" className={styles.secondaryOutlineBtn} disabled={!memberToAdd} onClick={addGroupMember}>
                      Add
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={closeGroupModal}>
                Cancel
              </button>
              <button type="button" className={styles.submitBtn} disabled={groupSubmitting} onClick={submitAccessGroup}>
                {groupSubmitting ? "Saving..." : "Save Access Group"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}