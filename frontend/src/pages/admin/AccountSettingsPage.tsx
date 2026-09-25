import { useState, type FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, Pencil, Lock, Loader2 } from "lucide-react";
import { isAxiosError } from "axios";
import api from "../../services/api";
import { useToast } from "../../hooks/useToast";
import { getApiErrorMessage } from "../../utils/apiError";
import type { AdminDashboardContext } from "./AdminDashboardLayout";
import { cardEntrance, cardHover } from "./shared";

function AccountSettingsPage() {
  const showToast = useToast();
  const { users, setUsers, currentUserId } = useOutletContext<AdminDashboardContext>();
  const selfUser = users.find((user) => user.id === currentUserId);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileName, setEditProfileName] = useState("");
  const [editProfileEmail, setEditProfileEmail] = useState("");
  const [editProfilePhone, setEditProfilePhone] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const handleStartEditProfile = () => {
    setEditProfileName(selfUser?.name || "");
    setEditProfileEmail(selfUser?.email || "");
    setEditProfilePhone(selfUser?.phone || "");
    setIsEditingProfile(true);
  };

  const handleCancelEditProfile = () => {
    setIsEditingProfile(false);
  };

  const handleSaveProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedEmail = editProfileEmail.trim();
    const trimmedPhone = editProfilePhone.trim();
    if (!trimmedEmail && !trimmedPhone) {
      showToast("Please provide either an email or a phone number", "error");
      return;
    }

    setIsSavingProfile(true);

    try {
      const response = await api.patch("/users/me", {
        name: editProfileName,
        email: trimmedEmail || null,
        phone: trimmedPhone || null,
      });
      setUsers((prev) =>
        prev.map((user) =>
          user.id === currentUserId
            ? {
                ...user,
                name: response.data.name,
                email: response.data.email ?? null,
                phone: response.data.phone ?? null,
              }
            : user
        )
      );
      setIsEditingProfile(false);
      showToast("Profile updated successfully", "success");
    } catch (err) {
      showToast(getApiErrorMessage(err, "Failed to update profile"), "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleStartChangePassword = () => {
    setCurrentPasswordInput("");
    setNewPasswordInput("");
    setIsChangingPassword(true);
  };

  const handleCancelChangePassword = () => {
    setIsChangingPassword(false);
  };

  const handleSavePassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSavingPassword(true);

    try {
      const response = await api.patch("/users/me/password", {
        current_password: currentPasswordInput,
        new_password: newPasswordInput,
      });
      setCurrentPasswordInput("");
      setNewPasswordInput("");
      setIsChangingPassword(false);
      showToast(response.data.message || "Password updated successfully", "success");
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        showToast(err.response.data.detail, "error");
      } else {
        showToast("Failed to update password", "error");
      }
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <motion.section
      id="account-settings"
      className="dash-card admin-section"
      {...cardEntrance(0)}
      whileHover={cardHover}
    >
      <h2 className="dash-card-title">
        <User size={18} className="dash-icon" style={{ color: "var(--color-cyan)" }} /> Account Settings
      </h2>

      <hr className="dash-divider" />
      <p className="dash-label">PROFILE</p>
      {!isEditingProfile && (
        <>
          <p className="dash-value-lg">{selfUser?.name || "—"}</p>
          <p className="bill-date">{selfUser?.email || "—"}</p>
          <p className="bill-date">{selfUser?.phone || "—"}</p>
          <motion.button
            className="dash-button-outline"
            onClick={handleStartEditProfile}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Pencil size={14} /> Edit Profile
          </motion.button>
        </>
      )}
      <AnimatePresence initial={false}>
        {isEditingProfile && (
          <motion.div
            key="edit-profile-form"
            initial={{ height: 0, opacity: 0, y: -8 }}
            animate={{ height: "auto", opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            <form onSubmit={handleSaveProfile}>
              <label className="auth-label" htmlFor="admin-account-settings-name">Name</label>
              <input
                id="admin-account-settings-name"
                className="auth-input"
                type="text"
                placeholder="Name"
                value={editProfileName}
                onChange={(e) => setEditProfileName(e.target.value)}
              />
              <label className="auth-label" htmlFor="admin-account-settings-email">Email</label>
              <input
                id="admin-account-settings-email"
                className="auth-input"
                type="email"
                placeholder="Email"
                value={editProfileEmail}
                onChange={(e) => setEditProfileEmail(e.target.value)}
              />
              <label className="auth-label" htmlFor="admin-account-settings-phone">Phone Number</label>
              <input
                id="admin-account-settings-phone"
                className="auth-input"
                type="tel"
                placeholder="+96170123456"
                value={editProfilePhone}
                onChange={(e) => setEditProfilePhone(e.target.value)}
              />
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <motion.button
                  className="dash-button"
                  type="submit"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  disabled={isSavingProfile}
                  style={{ flex: 1 }}
                >
                  {isSavingProfile ? <Loader2 size={16} className="btn-spinner" /> : "Save"}
                </motion.button>
                <motion.button
                  className="dash-button-outline"
                  type="button"
                  onClick={handleCancelEditProfile}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  style={{ flex: 1, marginTop: 0 }}
                >
                  Cancel
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <hr className="dash-divider" />
      <p className="dash-label">PASSWORD</p>
      {!isChangingPassword && (
        <motion.button
          className="dash-button-outline"
          onClick={handleStartChangePassword}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <Lock size={14} /> Change Password
        </motion.button>
      )}
      <AnimatePresence initial={false}>
        {isChangingPassword && (
          <motion.div
            key="change-password-form"
            initial={{ height: 0, opacity: 0, y: -8 }}
            animate={{ height: "auto", opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            <form onSubmit={handleSavePassword}>
              <input
                className="auth-input"
                type="password"
                placeholder="Current password"
                value={currentPasswordInput}
                onChange={(e) => setCurrentPasswordInput(e.target.value)}
              />
              <input
                className="auth-input"
                type="password"
                placeholder="New password"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
              />
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <motion.button
                  className="dash-button"
                  type="submit"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  disabled={isSavingPassword}
                  style={{ flex: 1 }}
                >
                  {isSavingPassword ? <Loader2 size={16} className="btn-spinner" /> : "Save"}
                </motion.button>
                <motion.button
                  className="dash-button-outline"
                  type="button"
                  onClick={handleCancelChangePassword}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  style={{ flex: 1, marginTop: 0 }}
                >
                  Cancel
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

export default AccountSettingsPage;
