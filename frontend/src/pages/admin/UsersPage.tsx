import { useState, type FormEvent, Fragment } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Users, BarChart3, Trash2, Pencil, Lock, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { isAxiosError } from "axios";
import api from "../../services/api";
import { useToast } from "../../hooks/useToast";
import ConfirmModal from "../../components/ConfirmModal";
import type { AdminDashboardContext, User } from "./AdminDashboardLayout";
import { statusPillClass, displayRole, cardEntrance, cardHover, rowEntrance, rowHover, CountUpValue } from "./shared";

function UsersPage() {
  const showToast = useToast();
  const { users, setUsers } = useOutletContext<AdminDashboardContext>();

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserEmail, setEditUserEmail] = useState("");
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
      showToast(`${user.name} deleted successfully`, "success");
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        showToast(err.response.data.detail, "error");
      } else {
        showToast("Failed to delete user", "error");
      }
    } finally {
      setDeletingUserId(null);
      setUserPendingDelete(null);
    }
  };

  const handleStartEditUser = (user: User) => {
    setEditingUserId(user.id);
    setEditUserName(user.name);
    setEditUserEmail(user.email);
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

    setIsSavingUser(true);

    try {
      const response = await api.patch(`/admin/users/${editingUserId}`, {
        name: editUserName,
        email: editUserEmail,
        role: editUserRole,
      });
      setUsers((prev) =>
        prev.map((user) => (user.id === editingUserId ? response.data : user))
      );
      setEditingUserId(null);
      showToast("User updated successfully", "success");
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        showToast(err.response.data.detail, "error");
      } else {
        showToast("Failed to update user", "error");
      }
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
      showToast("Password reset successfully", "success");
      setResetPasswordInput("");
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        showToast(err.response.data.detail, "error");
      } else {
        showToast("Failed to reset password", "error");
      }
    } finally {
      setIsResettingPassword(false);
    }
  };

  const roleCounts = ["subscriber", "owner", "admin"].map((role) => ({
    role: displayRole(role).charAt(0).toUpperCase() + displayRole(role).slice(1),
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
          <p className="dash-label">Subscribers</p>
          <p className="stat-number-amber">
            <CountUpValue value={users.filter((user) => user.role === "subscriber").length} />
          </p>
        </motion.div>

        <motion.div
          className="stat-card stat-card-cyan"
          {...cardEntrance(1)}
          whileHover={cardHover}
        >
          <p className="dash-label">Managers</p>
          <p className="stat-number-cyan">
            <CountUpValue value={users.filter((user) => user.role === "owner").length} />
          </p>
        </motion.div>

        <motion.div className="stat-card" {...cardEntrance(2)} whileHover={cardHover}>
          <p className="dash-label">Admins</p>
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
            <BarChart3 size={18} className="dash-icon" style={{ color: "var(--color-cyan)" }} /> Users by Role
          </h2>
          {users.length === 0 ? (
            <p className="forecast-message">Chart will appear once users register</p>
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
          <Users size={18} className="dash-icon" style={{ color: "var(--color-cyan)" }} /> Users
        </h2>
        {users.length === 0 ? (
          <p>No data yet</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Subscription</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <Fragment key={user.id}>
                    <motion.tr {...rowEntrance(index)} whileHover={rowHover}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={statusPillClass(user.role)}>
                          <span className="pill-dot"></span>
                          {displayRole(user.role).toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {user.role !== "subscriber" ? (
                          "—"
                        ) : user.subscription_status === "none" ? (
                          <span className={statusPillClass("none")}>
                            <span className="pill-dot"></span>
                            NO SUBSCRIPTION
                          </span>
                        ) : (
                          <span className={statusPillClass(user.subscription_status || "none")}>
                            <span className="pill-dot"></span>
                            {(user.subscription_status || "none").toUpperCase()}
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
                                <Trash2 size={14} /> Delete
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
                          <td colSpan={5}>
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25, ease: "easeInOut" }}
                              style={{ overflow: "hidden" }}
                            >
                              <form
                                onSubmit={handleSaveEditUser}
                                style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}
                              >
                                <input
                                  className="auth-input"
                                  type="text"
                                  placeholder="Name"
                                  value={editUserName}
                                  onChange={(e) => setEditUserName(e.target.value)}
                                  style={{ flex: "1 1 160px", marginBottom: 0 }}
                                />
                                <input
                                  className="auth-input"
                                  type="email"
                                  placeholder="Email"
                                  value={editUserEmail}
                                  onChange={(e) => setEditUserEmail(e.target.value)}
                                  style={{ flex: "1 1 200px", marginBottom: 0 }}
                                />
                                <select
                                  className="owner-select"
                                  value={editUserRole}
                                  onChange={(e) => setEditUserRole(e.target.value)}
                                  style={{ flex: "1 1 140px" }}
                                >
                                  <option value="subscriber">Subscriber</option>
                                  <option value="owner">Manager</option>
                                  <option value="admin">Admin</option>
                                </select>
                                <motion.button
                                  className="auth-button owner-submit-button"
                                  type="submit"
                                  whileHover={{ scale: 1.03 }}
                                  whileTap={{ scale: 0.97 }}
                                  disabled={isSavingUser}
                                  style={{ marginTop: 0, width: "auto", padding: "0.6rem 1rem" }}
                                >
                                  {isSavingUser ? <Loader2 size={14} className="btn-spinner" /> : "Save"}
                                </motion.button>
                                <motion.button
                                  className="dash-button-outline"
                                  type="button"
                                  onClick={handleCancelEditUser}
                                  whileHover={{ scale: 1.03 }}
                                  whileTap={{ scale: 0.97 }}
                                  style={{ marginTop: 0, width: "auto", padding: "0.6rem 1rem" }}
                                >
                                  Cancel
                                </motion.button>
                              </form>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "0.75rem",
                                  flexWrap: "wrap",
                                  alignItems: "center",
                                  marginTop: "0.75rem",
                                  paddingTop: "0.75rem",
                                  borderTop: "1px solid var(--color-border)",
                                }}
                              >
                                <input
                                  className="auth-input"
                                  type="password"
                                  placeholder="New Password"
                                  value={resetPasswordInput}
                                  onChange={(e) => setResetPasswordInput(e.target.value)}
                                  style={{ flex: "1 1 200px", marginBottom: 0 }}
                                />
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
                                      <Lock size={14} /> Reset Password
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
        title="Delete user"
        message={
          userPendingDelete
            ? `Are you sure you want to delete ${userPendingDelete.name}? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onConfirm={handleConfirmDeleteUser}
        onCancel={handleCancelDeleteUser}
      />
    </>
  );
}

export default UsersPage;
