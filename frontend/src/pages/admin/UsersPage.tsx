import { useState, type FormEvent, Fragment } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Users, BarChart3, Trash2, Pencil, Lock, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { isAxiosError } from "axios";
import api from "../../services/api";
import { useToast } from "../../hooks/useToast";
import ConfirmModal from "../../components/ConfirmModal";
import { getApiErrorMessage } from "../../utils/apiError";
import { useTranslation } from "react-i18next";
import type { AdminDashboardContext, User } from "./AdminDashboardLayout";
import { CountUpValue } from "./shared";
import { statusPillClass, translateStatus, displayRole, cardEntrance, cardHover, rowEntrance, rowHover } from "./helpers";

function UsersPage() {
  const showToast = useToast();
  const { t } = useTranslation();
  const { users, setUsers } = useOutletContext<AdminDashboardContext>();

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserPhone, setEditUserPhone] = useState("");
  const [editUserRole, setEditUserRole] = useState("subscriber");
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [userPendingDelete, setUserPendingDelete] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleRequestDeleteUser = (user: User) => {
    setUserPendingDelete(user);
  };

  const handleCancelDeleteUser = () => {
    setUserPendingDelete(null);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userPendingDelete) return;
    const user = userPendingDelete;

    setDeletingUserId(user.id);

    try {
      await api.delete(`/admin/users/${user.id}`);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      showToast(t("admin.users.toastDeleteSuccess", { name: user.name }), "success");
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        showToast(err.response.data.detail, "error");
      } else {
        showToast(t("admin.users.toastDeleteFailed"), "error");
      }
    } finally {
      setDeletingUserId(null);
      setUserPendingDelete(null);
    }
  };

  const handleStartEditUser = (user: User) => {
    setEditingUserId(user.id);
    setEditUserName(user.name);
    setEditUserEmail(user.email ?? "");
    setEditUserPhone(user.phone ?? "");
    setEditUserRole(user.role);
    setResetPasswordInput("");
  };

  const handleCancelEditUser = () => {
    setEditingUserId(null);
    setResetPasswordInput("");
  };

  const handleSaveEditUser = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUserId) return;

    const trimmedEmail = editUserEmail.trim();
    const trimmedPhone = editUserPhone.trim();
    if (!trimmedEmail && !trimmedPhone) {
      showToast(t("dashboard.accountSettings.toastEitherRequired"), "error");
      return;
    }

    setIsSavingUser(true);

    try {
      const response = await api.patch(`/admin/users/${editingUserId}`, {
        name: editUserName,
        email: trimmedEmail || null,
        phone: trimmedPhone || null,
        role: editUserRole,
      });
      setUsers((prev) =>
        prev.map((user) => (user.id === editingUserId ? response.data : user))
      );
      setEditingUserId(null);
      showToast(t("admin.users.toastUpdateSuccess"), "success");
    } catch (err) {
      showToast(getApiErrorMessage(err, t("admin.users.toastUpdateFailed")), "error");
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleResetPassword = async () => {
    if (!editingUserId) return;

    setIsResettingPassword(true);

    try {
      await api.patch(`/admin/users/${editingUserId}/reset-password`, {
        new_password: resetPasswordInput,
      });
      showToast(t("admin.users.toastResetSuccess"), "success");
      setResetPasswordInput("");
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        showToast(err.response.data.detail, "error");
      } else {
        showToast(t("admin.users.toastResetFailed"), "error");
      }
    } finally {
      setIsResettingPassword(false);
    }
  };

  const roleCounts = ["subscriber", "owner", "admin"].map((role) => ({
    role: displayRole(t, role),
    count: users.filter((user) => user.role === role).length,
  }));

  return (
    <>
      <div className="admin-stats-grid">
        <motion.div
          className="stat-card stat-card-amber"
          {...cardEntrance(0)}
          whileHover={cardHover}
        >
          <p className="dash-label">{t("admin.users.statSubscribers")}</p>
          <p className="stat-number-amber">
            <CountUpValue value={users.filter((user) => user.role === "subscriber").length} />
          </p>
        </motion.div>

        <motion.div
          className="stat-card stat-card-cyan"
          {...cardEntrance(1)}
          whileHover={cardHover}
        >
          <p className="dash-label">{t("admin.users.statManagers")}</p>
          <p className="stat-number-cyan">
            <CountUpValue value={users.filter((user) => user.role === "owner").length} />
          </p>
        </motion.div>

        <motion.div className="stat-card" {...cardEntrance(2)} whileHover={cardHover}>
          <p className="dash-label">{t("admin.users.statAdmins")}</p>
          <p className="dash-value-lg">
            <CountUpValue value={users.filter((user) => user.role === "admin").length} />
          </p>
        </motion.div>

        <motion.div
          className="dash-card admin-chart-card"
          {...cardEntrance(3)}
          whileHover={cardHover}
        >
          <h2 className="dash-card-title">
            <BarChart3 size={18} className="dash-icon" style={{ color: "var(--color-cyan)" }} /> {t("admin.users.chartTitle")}
          </h2>
          {users.length === 0 ? (
            <p className="forecast-message">{t("admin.users.chartEmpty")}</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={roleCounts}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="role" tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} />
                <YAxis hide={true} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-surface-2)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    color: "var(--color-text)",
                  }}
                />
                <Bar dataKey="count" fill="var(--color-cyan)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      <motion.section
        id="users"
        className="dash-card admin-section"
        {...cardEntrance(4)}
        whileHover={cardHover}
      >
        <h2 className="dash-card-title">
          <Users size={18} className="dash-icon" style={{ color: "var(--color-cyan)" }} /> {t("admin.users.title")}
        </h2>
        {users.length === 0 ? (
          <p>{t("admin.users.emptyState")}</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t("admin.users.colName")}</th>
                  <th>{t("admin.users.colEmail")}</th>
                  <th>{t("admin.users.colPhone")}</th>
                  <th>{t("admin.users.colRole")}</th>
                  <th>{t("admin.users.colSubscription")}</th>
                  <th>{t("admin.users.colAction")}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <Fragment key={user.id}>
                    <motion.tr {...rowEntrance(index)} whileHover={rowHover}>
                      <td>{user.name}</td>
                      <td>{user.email || "—"}</td>
                      <td>{user.phone || "—"}</td>
                      <td>
                        <span className={statusPillClass(user.role)}>
                          <span className="pill-dot"></span>
                          {displayRole(t, user.role).toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {user.role !== "subscriber" ? (
                          "—"
                        ) : user.subscription_status === "none" ? (
                          <span className={statusPillClass("none")}>
                            <span className="pill-dot"></span>
                            {translateStatus(t, "none")}
                          </span>
                        ) : (
                          <span className={statusPillClass(user.subscription_status || "none")}>
                            <span className="pill-dot"></span>
                            {translateStatus(t, user.subscription_status || "none")}
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <motion.button
                            className="dash-button-outline"
                            onClick={() => handleStartEditUser(user)}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            style={{ marginTop: 0, width: "auto", padding: "0.5rem 0.75rem" }}
                          >
                            <Pencil size={14} />
                          </motion.button>
                          <motion.button
                            className="admin-mobile-logout"
                            onClick={() => handleRequestDeleteUser(user)}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            disabled={deletingUserId === user.id}
                          >
                            {deletingUserId === user.id ? (
                              <Loader2 size={14} className="btn-spinner" />
                            ) : (
                              <>
                                <Trash2 size={14} /> {t("admin.users.delete")}
                              </>
                            )}
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                    <AnimatePresence initial={false}>
                      {editingUserId === user.id && (
                        <motion.tr
                          key="edit-row"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <td colSpan={6}>
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25, ease: "easeInOut" }}
                              style={{ overflow: "hidden" }}
                            >
                              <form
                                onSubmit={handleSaveEditUser}
                                style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}
                              >
                                <div style={{ flex: "1 1 160px" }}>
                                  <label className="auth-label" htmlFor={`user-edit-name-${user.id}`}>{t("register.name")}</label>
                                  <input
                                    id={`user-edit-name-${user.id}`}
                                    className="auth-input"
                                    type="text"
                                    placeholder={t("register.name")}
                                    value={editUserName}
                                    onChange={(e) => setEditUserName(e.target.value)}
                                    style={{ marginBottom: 0 }}
                                  />
                                </div>
                                <div style={{ flex: "1 1 200px" }}>
                                  <label className="auth-label" htmlFor={`user-edit-email-${user.id}`}>{t("register.email")}</label>
                                  <input
                                    id={`user-edit-email-${user.id}`}
                                    className="auth-input"
                                    type="email"
                                    placeholder={t("register.email")}
                                    value={editUserEmail}
                                    onChange={(e) => setEditUserEmail(e.target.value)}
                                    style={{ marginBottom: 0 }}
                                  />
                                </div>
                                <div style={{ flex: "1 1 180px" }}>
                                  <label className="auth-label" htmlFor={`user-edit-phone-${user.id}`}>{t("dashboard.subscription.phoneLabel")}</label>
                                  <input
                                    id={`user-edit-phone-${user.id}`}
                                    className="auth-input"
                                    type="tel"
                                    placeholder="+96170123456"
                                    value={editUserPhone}
                                    onChange={(e) => setEditUserPhone(e.target.value)}
                                    style={{ marginBottom: 0 }}
                                  />
                                </div>
                                <div style={{ flex: "1 1 140px" }}>
                                  <label className="auth-label" htmlFor={`user-edit-role-${user.id}`}>{t("admin.users.colRole")}</label>
                                  <select
                                    id={`user-edit-role-${user.id}`}
                                    className="owner-select"
                                    value={editUserRole}
                                    onChange={(e) => setEditUserRole(e.target.value)}
                                    style={{ width: "100%" }}
                                  >
                                    <option value="subscriber">{t("common.roles.subscriber")}</option>
                                    <option value="owner">{t("common.roles.owner")}</option>
                                    <option value="admin">{t("common.roles.admin")}</option>
                                  </select>
                                </div>
                                <motion.button
                                  className="auth-button owner-submit-button"
                                  type="submit"
                                  whileHover={{ scale: 1.03 }}
                                  whileTap={{ scale: 0.97 }}
                                  disabled={isSavingUser}
                                  style={{ marginTop: 0, width: "auto", padding: "0.6rem 1rem" }}
                                >
                                  {isSavingUser ? <Loader2 size={14} className="btn-spinner" /> : t("common.save")}
                                </motion.button>
                                <motion.button
                                  className="dash-button-outline"
                                  type="button"
                                  onClick={handleCancelEditUser}
                                  whileHover={{ scale: 1.03 }}
                                  whileTap={{ scale: 0.97 }}
                                  style={{ marginTop: 0, width: "auto", padding: "0.6rem 1rem" }}
                                >
                                  {t("common.cancel")}
                                </motion.button>
                              </form>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "0.75rem",
                                  flexWrap: "wrap",
                                  alignItems: "flex-end",
                                  marginTop: "0.75rem",
                                  paddingTop: "0.75rem",
                                  borderTop: "1px solid var(--color-border)",
                                }}
                              >
                                <div style={{ flex: "1 1 200px" }}>
                                  <label className="auth-label" htmlFor={`user-reset-password-${user.id}`}>{t("admin.users.newPassword")}</label>
                                  <input
                                    id={`user-reset-password-${user.id}`}
                                    className="auth-input"
                                    type="password"
                                    placeholder={t("admin.users.newPassword")}
                                    value={resetPasswordInput}
                                    onChange={(e) => setResetPasswordInput(e.target.value)}
                                    style={{ marginBottom: 0 }}
                                  />
                                </div>
                                <motion.button
                                  className="dash-button-outline"
                                  type="button"
                                  onClick={handleResetPassword}
                                  whileHover={{ scale: 1.03 }}
                                  whileTap={{ scale: 0.97 }}
                                  disabled={isResettingPassword}
                                  style={{ marginTop: 0, width: "auto", padding: "0.6rem 1rem" }}
                                >
                                  {isResettingPassword ? (
                                    <Loader2 size={14} className="btn-spinner" />
                                  ) : (
                                    <>
                                      <Lock size={14} /> {t("admin.users.resetPassword")}
                                    </>
                                  )}
                                </motion.button>
                              </div>
                            </motion.div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.section>

      <ConfirmModal
        open={userPendingDelete !== null}
        title={t("admin.users.deleteModalTitle")}
        message={
          userPendingDelete
            ? t("admin.users.deleteModalMessage", { name: userPendingDelete.name })
            : ""
        }
        confirmLabel={t("admin.users.delete")}
        cancelLabel={t("common.cancel")}
        danger
        onConfirm={handleConfirmDeleteUser}
        onCancel={handleCancelDeleteUser}
      />
    </>
  );
}

export default UsersPage;
