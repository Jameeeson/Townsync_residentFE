"use client";

import { FormEvent, useCallback, useRef, useState } from "react";
import { IconX } from "@/components/icons";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { ApiError } from "@/lib/api-client";
import { changeStaffPassword } from "@/lib/services/staff";
import styles from "./ChangePasswordModal.module.css";

type Props = {
  onClose: () => void;
  onSuccess: () => void;
};

export function ChangePasswordModal({ onClose, onSuccess }: Props) {
  const modalRef = useRef<HTMLDivElement>(null);
  const handleClose = useCallback(() => onClose(), [onClose]);
  useDialogA11y(true, handleClose, modalRef);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await changeStaffPassword(currentPassword, newPassword);
      onSuccess();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not change password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.overlay} role="presentation" onClick={handleClose}>
      <div
        ref={modalRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <h2 id="change-password-title">Change Password</h2>
            <p>Update your staff account credentials.</p>
          </div>
          <button type="button" className={styles.close} onClick={handleClose} aria-label="Close">
            <IconX size={20} />
          </button>
        </header>

        <form className={styles.body} onSubmit={handleSubmit}>
          {error ? <p className={styles.formError} role="alert">{error}</p> : null}

          <div className={styles.field}>
            <label htmlFor="current-password">Current password</label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <p className={styles.hint}>At least 8 characters.</p>
          </div>

          <div className={styles.field}>
            <label htmlFor="confirm-password">Confirm new password</label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <div className={styles.actions}>
            <button type="submit" className={styles.primary} disabled={submitting}>
              {submitting ? "Updating…" : "Update Password"}
            </button>
            <button type="button" className={styles.secondary} onClick={handleClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChangePasswordModal;
