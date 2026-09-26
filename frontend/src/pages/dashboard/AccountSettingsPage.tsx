import { useState, type FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, Pencil, Lock, Loader2 } from "lucide-react";
import { isAxiosError } from "axios";
import api from "../../services/api";
import { useToast } from "../../hooks/useToast";
import { getApiErrorMessage } from "../../utils/apiError";
import { useTranslation } from "react-i18next";
import type { DashboardContext } from "./DashboardLayout";
import { cardEntrance, cardHover } from "./helpers";

function AccountSettingsPage() {
  const showToast = useToast();
  const { t } = useTranslation();
  const { profileName, setProfileName, profileEmail, setProfileEmail, profilePhone, setProfilePhone } =
    useOutletContext<DashboardContext>();

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
    setEditProfileName(profileName);
    setEditProfileEmail(profileEmail);
    setEditProfilePhone(profilePhone);
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
      showToast(t("dashboard.accountSettings.toastEitherRequired"), "error");
      return;
    }

    setIsSavingProfile(true);

    try {
      const response = await api.patch("/users/me", {
        name: editProfileName,
        email: trimmedEmail || null,
        phone: trimmedPhone || null,
      });
      setProfileName(response.data.name);
      setProfileEmail(response.data.email ?? "");
      setProfilePhone(response.data.phone ?? "");
      setIsEditingProfile(false);
      showToast(t("dashboard.accountSettings.toastProfileSuccess"), "success");
    } catch (err) {
      showToast(getApiErrorMessage(err, t("dashboard.accountSettings.toastProfileFailed")), "error");
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
      showToast(response.data.message || t("dashboard.accountSettings.toastPasswordSuccess"), "success");
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        showToast(err.response.data.detail, "error");
      } else {
        showToast(t("dashboard.accountSettings.toastPasswordFailed"), "error");
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
        <User size={18} className="dash-icon" style={{ color: "var(--color-cyan)" }} /> {t("dashboard.accountSettings.title")}
      </h2>

      <hr className="dash-divider" />
      <p className="dash-label">{t("dashboard.accountSettings.profile")}</p>
      {!isEditingProfile && (
        <>
          <p className="dash-value-lg">{profileName || "—"}</p>
          <p className="bill-date">{profileEmail || "—"}</p>
          <p className="bill-date">{profilePhone || "—"}</p>
          <motion.button
            className="dash-button-outline"
            onClick={handleStartEditProfile}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Pencil size={14} /> {t("dashboard.accountSettings.editProfile")}
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
              <label className="auth-label" htmlFor="account-settings-name">{t("register.name")}</label>
              <input
                id="account-settings-name"
                className="auth-input"
                type="text"
                placeholder={t("register.name")}
                value={editProfileName}
                onChange={(e) => setEditProfileName(e.target.value)}
              />
              <label className="auth-label" htmlFor="account-settings-email">{t("register.email")}</label>
              <input
                id="account-settings-email"
                className="auth-input"
                type="email"
                placeholder={t("register.email")}
                value={editProfileEmail}
                onChange={(e) => setEditProfileEmail(e.target.value)}
              />
              <label className="auth-label" htmlFor="account-settings-phone">{t("register.phone")}</label>
              <input
                id="account-settings-phone"
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
                  {isSavingProfile ? <Loader2 size={16} className="btn-spinner" /> : t("common.save")}
                </motion.button>
                <motion.button
                  className="dash-button-outline"
                  type="button"
                  onClick={handleCancelEditProfile}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  style={{ flex: 1, marginTop: 0 }}
                >
                  {t("common.cancel")}
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <hr className="dash-divider" />
      <p className="dash-label">{t("dashboard.accountSettings.password")}</p>
      {!isChangingPassword && (
        <motion.button
          className="dash-button-outline"
          onClick={handleStartChangePassword}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <Lock size={14} /> {t("dashboard.accountSettings.changePassword")}
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
              <label className="auth-label" htmlFor="account-settings-current-password">{t("dashboard.accountSettings.currentPassword")}</label>
              <input
                id="account-settings-current-password"
                className="auth-input"
                type="password"
                placeholder={t("dashboard.accountSettings.currentPassword")}
                value={currentPasswordInput}
                onChange={(e) => setCurrentPasswordInput(e.target.value)}
              />
              <label className="auth-label" htmlFor="account-settings-new-password">{t("dashboard.accountSettings.newPassword")}</label>
              <input
                id="account-settings-new-password"
                className="auth-input"
                type="password"
                placeholder={t("dashboard.accountSettings.newPassword")}
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
                  {isSavingPassword ? <Loader2 size={16} className="btn-spinner" /> : t("common.save")}
                </motion.button>
                <motion.button
                  className="dash-button-outline"
                  type="button"
                  onClick={handleCancelChangePassword}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  style={{ flex: 1, marginTop: 0 }}
                >
                  {t("common.cancel")}
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
