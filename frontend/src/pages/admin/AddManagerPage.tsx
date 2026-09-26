// Form for an admin to create a manager account.
import { useState, type FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { UserPlus, Loader2 } from "lucide-react";
import { isAxiosError } from "axios";
import api from "../../services/api";
import { useToast } from "../../hooks/useToast";
import { useTranslation } from "react-i18next";
import type { AdminDashboardContext } from "./AdminDashboardLayout";
import { cardEntrance, cardHover } from "./helpers";

function AddManagerPage() {
  const showToast = useToast();
  const { t } = useTranslation();
  const { fetchUsers } = useOutletContext<AdminDashboardContext>();

  const [managerName, setManagerName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [managerPassword, setManagerPassword] = useState("");
  const [isAddingManager, setIsAddingManager] = useState(false);

  const handleAddManager = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsAddingManager(true);

    try {
      await api.post("/admin/add-manager", {
        name: managerName,
        email: managerEmail,
        password: managerPassword,
      });
      showToast(t("admin.addManager.toastSuccess"), "success");
      setManagerName("");
      setManagerEmail("");
      setManagerPassword("");
      fetchUsers();
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        showToast(err.response.data.detail, "error");
      } else {
        showToast(t("admin.addManager.toastFailed"), "error");
      }
    } finally {
      setIsAddingManager(false);
    }
  };

  return (
    <motion.section
      id="add-manager"
      className="dash-card admin-section admin-form-card"
      {...cardEntrance(0)}
      whileHover={cardHover}
    >
      <h2 className="dash-card-title admin-form-title">
        <UserPlus size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> {t("admin.addManager.title")}
      </h2>
      <form onSubmit={handleAddManager} className="admin-form-grid">
        <div className="admin-form-field">
          <label className="auth-label" htmlFor="admin-add-manager-name">{t("register.name")}</label>
          <input
            id="admin-add-manager-name"
            className="auth-input"
            type="text"
            placeholder={t("register.name")}
            value={managerName}
            onChange={(e) => setManagerName(e.target.value)}
          />
        </div>
        <div className="admin-form-field">
          <label className="auth-label" htmlFor="admin-add-manager-email">{t("register.email")}</label>
          <input
            id="admin-add-manager-email"
            className="auth-input"
            type="email"
            placeholder={t("register.email")}
            value={managerEmail}
            onChange={(e) => setManagerEmail(e.target.value)}
          />
        </div>
        <div className="admin-form-field admin-form-full">
          <label className="auth-label" htmlFor="admin-add-manager-password">{t("register.password")}</label>
          <input
            id="admin-add-manager-password"
            className="auth-input"
            type="password"
            placeholder={t("register.password")}
            value={managerPassword}
            onChange={(e) => setManagerPassword(e.target.value)}
          />
        </div>
        <motion.button
          className="auth-button admin-form-full"
          type="submit"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          disabled={isAddingManager}
        >
          {isAddingManager ? <Loader2 size={16} className="btn-spinner" /> : t("admin.addManager.submit")}
        </motion.button>
      </form>
    </motion.section>
  );
}

export default AddManagerPage;
