"use client";

import { useState } from "react";
import {
  ArrowLeft,
  User,
  Building2,
  FileText,
  UploadCloud,
  UserPlus,
  Info,
  ChevronDown,
  Contact2,
} from "lucide-react";
import styles from "@/components/styles/addresident.module.css";

type AddResidentViewProps = {
  onBack: () => void;
};

export default function AddResidentView({ onBack }: AddResidentViewProps) {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    moveInDate: "",
    unit: "",
    block: "",
    occupancyType: "Tenant" as "Owner" | "Tenant",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
                  type="tel"
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
                <label htmlFor="block">Block</label>
                <div className={styles.selectWrapper}>
                  <select id="block" name="block" value={formData.block} onChange={handleInputChange}>
                    <option value="">Select Block</option>
                    <option value="A">Block A</option>
                    <option value="B">Block B</option>
                  </select>
                  <ChevronDown size={16} className={styles.selectArrow} />
                </div>
              </div>
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
            <div className={styles.dropzone}>
              <div className={styles.uploadIcon}>
                <UploadCloud size={24} color="#1d4ed8" />
              </div>
              <p>
                <strong>Click to upload</strong> or drag and drop
              </p>
              <span>PDF, PNG, or JPG (max. 10MB)</span>
            </div>
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

          <div className={styles.actionBox}>
            <button type="button" className={styles.primaryBtn}>
              <UserPlus size={18} />
              Complete Onboarding
            </button>
            <button type="button" className={styles.secondaryBtn}>
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
