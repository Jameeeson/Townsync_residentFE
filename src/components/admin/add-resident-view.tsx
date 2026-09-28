"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Building2,
  FileText,
  UploadCloud,
  UserPlus,
  Info,
  Contact2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { apiPost } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import {
  ACCEPTED_DOC_TYPES,
  DOC_TYPE_LABELS,
  uploadResidentDocument,
  validateDocFile,
  type ResidentDocType,
} from "@/lib/resident-documents";
import styles from "@/components/styles/addresident.module.css";

type AddResidentViewProps = {
  onBack: () => void;
};

export default function AddResidentView({ onBack }: AddResidentViewProps) {
  const { toast, toastError } = useToast();
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    moveInDate: "",
    unit: "",
    occupancyType: "Tenant" as "Owner" | "Tenant",
  });
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<ResidentDocType>("Lease");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const submit = async (isDraft: boolean) => {
    const trimmedName = formData.fullName.trim();
    if (!trimmedName || !formData.email || !formData.unit) {
      setError("Full name, email, and unit number are required.");
      return;
    }
    const [firstName, ...rest] = trimmedName.split(/\s+/);
    const lastName = rest.join(" ");
    if (docFile) {
      const fileError = validateDocFile(docFile);
      if (fileError) {
        setError(fileError);
        return;
      }
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiPost<{ status: string; user_id: number; temporary_password: string }>(
        "/api/v1/admin/residents/onboard",
        {
          first_name: firstName,
          last_name: lastName,
          email: formData.email,
          unit_number: formData.unit,
          occupancy_type: formData.occupancyType === "Owner" ? "Homeowner" : "Tenant",
          phone_number: formData.phone || null,
          move_in_date: formData.moveInDate || null,
          is_draft: isDraft,
        },
      );
      let uploadNote = "";
      if (docFile) {
        try {
          await uploadResidentDocument(res.user_id, docType, docFile);
          uploadNote = " Document uploaded.";
        } catch (uploadErr) {
          uploadNote = ` Resident created, but the document upload failed: ${
            uploadErr instanceof Error ? uploadErr.message : "unknown error"
          }`;
        }
      }
      setResult(
        (isDraft
          ? `Saved as draft (Pending). Temporary password: ${res.temporary_password}`
          : "Resident onboarded and set to Active. Welcome email sent.") + uploadNote,
      );
      toast(
        isDraft
          ? `${formData.email} saved as a pending draft.`
          : `${formData.email} onboarded and set to Active.`,
        "success",
      );
      if (!isDraft) {
        setTimeout(() => router.push("/admin/residents"), 1800);
      }
    } catch (err) {
      toastError(err, "Could not onboard this resident.");
      setError(err instanceof Error ? err.message : "Failed to onboard resident");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button type="button" className={styles.backButton} aria-label="Go back" onClick={onBack}>
          <ArrowLeft size={22} />
        </button>
        <div className={styles.headerTitle}>
          <h1>Add Resident</h1>
          <p>Onboard a new member to the TownSync community.</p>
        </div>
      </header>

      <div className={styles.layout}>
        <div className={styles.formContent}>
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <User size={20} className={styles.iconBlue} />
              <h2>Personal Information</h2>
            </div>
            <div className={styles.inputGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="fullName">Full Name</label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="e.g. Jonathan Doe"
                  value={formData.fullName}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="j.doe@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="phone">Phone Number</label>
                <input
                  id="phone"
                  name="phone"
                  type="text"
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="moveInDate">Move-in Date</label>
                <input
                  id="moveInDate"
                  name="moveInDate"
                  type="date"
                  value={formData.moveInDate}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <Building2 size={20} className={styles.iconBlue} />
              <h2>Unit Assignment</h2>
            </div>
            <div className={styles.unitGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="unit">Lot / Unit Number</label>
                <input
                  id="unit"
                  name="unit"
                  type="text"
                  placeholder="e.g. 104"
                  value={formData.unit}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Occupancy Type</label>
                <div className={styles.segmentedControl}>
                  <button
                    type="button"
                    className={formData.occupancyType === "Owner" ? styles.active : undefined}
                    onClick={() => setFormData((p) => ({ ...p, occupancyType: "Owner" }))}
                  >
                    Owner
                  </button>
                  <button
                    type="button"
                    className={formData.occupancyType === "Tenant" ? styles.active : undefined}
                    onClick={() => setFormData((p) => ({ ...p, occupancyType: "Tenant" }))}
                  >
                    Tenant
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeaderWithMeta}>
              <div className={styles.cardHeader}>
                <FileText size={20} className={styles.iconBlue} />
                <h2>Documents</h2>
              </div>
              <span className={styles.metaRequirement}>Required: Lease or Ownership Deed</span>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="docType">Document Type</label>
              <select id="docType" value={docType} onChange={(e) => setDocType(e.target.value as ResidentDocType)}>
                {(Object.keys(DOC_TYPE_LABELS) as ResidentDocType[]).map((t) => (
                  <option key={t} value={t}>
                    {DOC_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <label className={styles.dropzone} htmlFor="docFile" style={{ cursor: "pointer" }}>
              <div className={styles.uploadIcon}>
                <UploadCloud size={24} color="#1d4ed8" />
              </div>
              <p>{docFile ? docFile.name : "Click to choose a file"}</p>
              <span>PDF, PNG, or JPG (max. 10MB). Uploaded right after the account is created.</span>
              <input
                id="docFile"
                type="file"
                accept={ACCEPTED_DOC_TYPES}
                style={{ display: "none" }}
                onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </section>
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.previewCard}>
            <div className={styles.previewHeader}>
              <span>PREVIEW CARD</span>
              <Contact2 className={styles.watermark} size={48} />
            </div>

            <div className={styles.idBody}>
              <div className={styles.avatarPlaceholder}>
                <div className={styles.avatarTop} />
                <div className={styles.avatarBottom} />
              </div>
              <div className={styles.idText}>
                <h3>{formData.fullName || "New Resident"}</h3>
                <span className={styles.statusBadge}>PENDING VERIFICATION</span>
              </div>
            </div>

            <div className={styles.idFooter}>
              <div className={styles.idStat}>
                <span className={styles.idLabel}>Unit</span>
                <span className={styles.idValue}>
                  {formData.unit ? `Unit ${formData.unit}` : "Not assigned"}
                </span>
              </div>
              <div className={styles.idStat}>
                <span className={styles.idLabel}>Status</span>
                <span className={styles.idValue}>In-processing</span>
              </div>
            </div>
          </div>

          {error ? (
            <p style={{ color: "#b91c1c", fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <AlertCircle size={16} /> {error}
            </p>
          ) : null}
          {result ? (
            <p style={{ color: "#047857", fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <CheckCircle2 size={16} /> {result}
            </p>
          ) : null}

          <div className={styles.actionBox}>
            <button type="button" className={styles.primaryBtn} disabled={submitting} onClick={() => submit(false)}>
              <UserPlus size={18} />
              {submitting ? "Submitting..." : "Complete Onboarding"}
            </button>
            <button type="button" className={styles.secondaryBtn} disabled={submitting} onClick={() => submit(true)}>
              Save as Draft
            </button>
            <p className={styles.actionNote}>
              By clicking &quot;Complete Onboarding&quot;, an automated welcome email with login
              credentials will be sent to the resident.
            </p>
          </div>

          <div className={styles.helpBox}>
            <div className={styles.helpHeader}>
              <Info size={18} color="#b45309" />
              <h4>Need help?</h4>
            </div>
            <p>
              Ensure you have the valid occupancy documents before proceeding. Residents without
              documents cannot be verified for voting rights.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
