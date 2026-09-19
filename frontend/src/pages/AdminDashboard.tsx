import { useEffect, useState, FormEvent, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Zap, Receipt, ShieldCheck, BarChart3, LogOut, UserPlus, DollarSign, Trash2, User, Pencil, Lock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { isAxiosError } from "axios";
import api from "../services/api";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Subscription {
  id: string;
  subscriber_id: string;
  generator_name: string;
  ampere: number;
  tariff_rate: number;
  status: string;
  subscriber_name?: string;
}

interface Bill {
  id: string;
  subscriber_id: string;
  meter_reading_id: string;
  consumption_kwh: number;
  amount: number;
  status: string;
  created_at: string;
  due_date: string;
  subscriber_name?: string;
}

function displayRole(role: string): string {
  return role === "owner" ? "Manager" : role;
}

function statusPillClass(status: string): string {
  switch (status) {
    case "active":
    case "resolved":
    case "paid":
    case "admin":
      return "pill pill-success";
    case "pending":
    case "owner":
      return "pill pill-warning";
    case "disputed":
      return "pill pill-danger";
    default:
      return "pill pill-cyan";
  }
}

const CARD_STAGGER = 0.08;
const cardHover = {
  scale: 1.015,
  y: -4,
  transition: { type: "spring" as const, stiffness: 300, damping: 20 },
};

function cardEntrance(index: number) {
  return {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay: index * CARD_STAGGER, ease: "easeOut" as const },
  };
}

const NAV_ITEMS = [
  { id: "users", label: "Users", icon: Users },
  { id: "subscriptions", label: "Subscriptions", icon: Zap },
  { id: "bills", label: "Bills", icon: Receipt },
  { id: "add-manager", label: "Add Manager", icon: UserPlus },
  { id: "pricing", label: "Pricing", icon: DollarSign },
];

function AdminDashboard() {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [managerName, setManagerName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [managerPassword, setManagerPassword] = useState("");
  const [managerMessage, setManagerMessage] = useState("");
  const [managerError, setManagerError] = useState("");
  const [tariffPrice, setTariffPrice] = useState<number | null>(null);
  const [tariffInput, setTariffInput] = useState("");
  const [tariffMessage, setTariffMessage] = useState("");
  const [tariffError, setTariffError] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const [userError, setUserError] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserRole, setEditUserRole] = useState("subscriber");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileName, setEditProfileName] = useState("");
  const [editProfileEmail, setEditProfileEmail] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const selfUser = users.find((user) => user.id === currentUserId);

  const fetchUsers = () => {
    api.get("/admin/users").then((response) => setUsers(response.data));
  };

  useEffect(() => {
    api.get("/me").then((response) => setCurrentUserId(response.data.id));
    fetchUsers();
    api
      .get("/admin/subscriptions")
      .then((response) => setSubscriptions(response.data));
    api.get("/admin/bills").then((response) => setBills(response.data));
    api.get("/tariff").then((response) => {
      setTariffPrice(response.data.price_per_ampere);
      setTariffInput(String(response.data.price_per_ampere));
    });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const handleAddManager = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setManagerMessage("");
    setManagerError("");

    try {
      await api.post("/admin/add-manager", {
        name: managerName,
        email: managerEmail,
        password: managerPassword,
      });
      setManagerMessage("Manager account created successfully");
      setManagerName("");
      setManagerEmail("");
      setManagerPassword("");
      fetchUsers();
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        setManagerError(err.response.data.detail);
      } else {
        setManagerError("Failed to create manager account");
      }
    }
  };

  const handleUpdateTariff = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTariffMessage("");
    setTariffError("");

    try {
      const response = await api.put("/admin/tariff", {
        price_per_ampere: Number(tariffInput),
      });
      setTariffPrice(response.data.price_per_ampere);
      setTariffMessage("Price updated successfully");
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        setTariffError(err.response.data.detail);
      } else {
        setTariffError("Failed to update price");
      }
    }
  };

  const handleMarkPaid = async (billId: string) => {
    try {
      await api.patch(`/bills/${billId}/mark-paid`);
      setBills((prev) =>
        prev.map((bill) => (bill.id === billId ? { ...bill, status: "paid" } : bill))
      );
    } catch {
      // mark-paid failed; leave the bill status as-is
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`Are you sure you want to delete ${user.name}? This cannot be undone.`)) {
      return;
    }

    setUserMessage("");
    setUserError("");

    try {
      await api.delete(`/admin/users/${user.id}`);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setUserMessage(`${user.name} deleted successfully`);
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        setUserError(err.response.data.detail);
      } else {
        setUserError("Failed to delete user");
      }
    }
  };

  const handleStartEditUser = (user: User) => {
    setEditingUserId(user.id);
    setEditUserName(user.name);
    setEditUserEmail(user.email);
    setEditUserRole(user.role);
    setUserMessage("");
    setUserError("");
  };

  const handleCancelEditUser = () => {
    setEditingUserId(null);
  };

  const handleSaveEditUser = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUserId) return;

    setUserMessage("");
    setUserError("");

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
      setUserMessage("User updated successfully");
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        setUserError(err.response.data.detail);
      } else {
        setUserError("Failed to update user");
      }
    }
  };

  const handleToggleSubscriptionStatus = async (subscriptionId: string) => {
    try {
      const response = await api.patch(`/admin/subscriptions/${subscriptionId}/toggle-status`);
      setSubscriptions((prev) =>
        prev.map((subscription) =>
          subscription.id === subscriptionId
            ? { ...subscription, status: response.data.status }
            : subscription
        )
      );
    } catch {
      // toggle-status failed; leave the subscription status as-is
    }
  };

  const handleStartEditProfile = () => {
    setEditProfileName(selfUser?.name || "");
    setEditProfileEmail(selfUser?.email || "");
    setProfileMessage("");
    setProfileError("");
    setIsEditingProfile(true);
  };

  const handleCancelEditProfile = () => {
    setIsEditingProfile(false);
    setProfileError("");
  };

  const handleSaveProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProfileMessage("");
    setProfileError("");

    try {
      const response = await api.patch("/users/me", {
        name: editProfileName,
        email: editProfileEmail,
      });
      setUsers((prev) =>
        prev.map((user) =>
          user.id === currentUserId
            ? { ...user, name: response.data.name, email: response.data.email }
            : user
        )
      );
      setIsEditingProfile(false);
      setProfileMessage("Profile updated successfully");
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        setProfileError(err.response.data.detail);
      } else {
        setProfileError("Failed to update profile");
      }
    }
  };

  const handleStartChangePassword = () => {
    setCurrentPasswordInput("");
    setNewPasswordInput("");
    setPasswordMessage("");
    setPasswordError("");
    setIsChangingPassword(true);
  };

  const handleCancelChangePassword = () => {
    setIsChangingPassword(false);
    setPasswordError("");
  };

  const handleSavePassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordMessage("");
    setPasswordError("");

    try {
      const response = await api.patch("/users/me/password", {
        current_password: currentPasswordInput,
        new_password: newPasswordInput,
      });
      setCurrentPasswordInput("");
      setNewPasswordInput("");
      setIsChangingPassword(false);
      setPasswordMessage(response.data.message || "Password updated successfully");
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        setPasswordError(err.response.data.detail);
      } else {
        setPasswordError("Failed to update password");
      }
    }
  };

  const roleCounts = ["subscriber", "owner", "admin"].map((role) => ({
    role: displayRole(role).charAt(0).toUpperCase() + displayRole(role).slice(1),
    count: users.filter((user) => user.role === role).length,
  }));

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">⚡ WattShare</div>
        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <a key={item.id} href={`#${item.id}`} className="admin-nav-link">
                <Icon size={18} />
                {item.label}
              </a>
            );
          })}
        </nav>
        <motion.button
          className="dash-button-logout"
          onClick={handleLogout}
          whileTap={{ scale: 0.97 }}
        >
          <LogOut size={18} /> Log Out
        </motion.button>
      </aside>

      <div className="admin-mobile-bar">
        <div className="admin-sidebar-logo admin-mobile-logo">⚡ WattShare</div>
        <motion.button
          className="admin-mobile-logout"
          onClick={handleLogout}
          whileTap={{ scale: 0.97 }}
        >
          <LogOut size={16} /> Log Out
        </motion.button>
      </div>

      <main className="admin-main">
        <div className="dash-page-title">
          <ShieldCheck size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> Admin Dashboard
        </div>

        <div className="admin-stats-grid">
          <motion.div
            className="stat-card stat-card-amber"
            {...cardEntrance(0)}
            whileHover={cardHover}
          >
            <p className="dash-label">Subscribers</p>
            <p className="stat-number-amber">
              {users.filter((user) => user.role === "subscriber").length}
            </p>
          </motion.div>

          <motion.div
            className="stat-card stat-card-cyan"
            {...cardEntrance(1)}
            whileHover={cardHover}
          >
            <p className="dash-label">Managers</p>
            <p className="stat-number-cyan">
              {users.filter((user) => user.role === "owner").length}
            </p>
          </motion.div>

          <motion.div className="stat-card" {...cardEntrance(2)} whileHover={cardHover}>
            <p className="dash-label">Admins</p>
            <p className="dash-value-lg">
              {users.filter((user) => user.role === "admin").length}
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
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <Fragment key={user.id}>
                      <tr>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td>
                          <span className={statusPillClass(user.role)}>
                            <span className="pill-dot"></span>
                            {displayRole(user.role).toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <motion.button
                              className="dash-button-outline"
                              onClick={() => handleStartEditUser(user)}
                              whileTap={{ scale: 0.97 }}
                              style={{ marginTop: 0, width: "auto", padding: "0.5rem 0.75rem" }}
                            >
                              <Pencil size={14} />
                            </motion.button>
                            <motion.button
                              className="admin-mobile-logout"
                              onClick={() => handleDeleteUser(user)}
                              whileTap={{ scale: 0.97 }}
                            >
                              <Trash2 size={14} /> Delete
                            </motion.button>
                          </div>
                        </td>
                      </tr>
                      {editingUserId === user.id && (
                        <tr>
                          <td colSpan={4}>
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
                                whileTap={{ scale: 0.97 }}
                                style={{ marginTop: 0, width: "auto", padding: "0.6rem 1rem" }}
                              >
                                Save
                              </motion.button>
                              <motion.button
                                className="dash-button-outline"
                                type="button"
                                onClick={handleCancelEditUser}
                                whileTap={{ scale: 0.97 }}
                                style={{ marginTop: 0, width: "auto", padding: "0.6rem 1rem" }}
                              >
                                Cancel
                              </motion.button>
                            </form>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {userMessage && <p className="dash-success">{userMessage}</p>}
          {userError && <p className="dash-error">{userError}</p>}
        </motion.section>

        <motion.section
          id="subscriptions"
          className="dash-card admin-section"
          {...cardEntrance(5)}
          whileHover={cardHover}
        >
          <h2 className="dash-card-title">
            <Zap size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> Subscriptions
          </h2>
          {subscriptions.length === 0 ? (
            <p>No data yet</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Subscriber</th>
                    <th>Ampere</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((subscription) => (
                    <tr key={subscription.id}>
                      <td>{subscription.subscriber_name || subscription.subscriber_id}</td>
                      <td>{subscription.ampere}A</td>
                      <td>
                        <span className={statusPillClass(subscription.status)}>
                          <span className="pill-dot"></span>
                          {subscription.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {subscription.status === "active" ? (
                          <motion.button
                            className="admin-mobile-logout"
                            onClick={() => handleToggleSubscriptionStatus(subscription.id)}
                            whileTap={{ scale: 0.97 }}
                          >
                            Deactivate
                          </motion.button>
                        ) : (
                          <motion.button
                            className="auth-button owner-submit-button"
                            onClick={() => handleToggleSubscriptionStatus(subscription.id)}
                            whileTap={{ scale: 0.97 }}
                          >
                            Activate
                          </motion.button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.section>

        <motion.section
          id="bills"
          className="dash-card admin-section"
          {...cardEntrance(6)}
          whileHover={cardHover}
        >
          <h2 className="dash-card-title">
            <Receipt size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> Bills
          </h2>
          {bills.length === 0 ? (
            <p>No data yet</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Subscriber</th>
                    <th>Consumption</th>
                    <th>Due Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((bill) => (
                    <tr key={bill.id}>
                      <td>{bill.subscriber_name || bill.subscriber_id}</td>
                      <td>{bill.consumption_kwh} kWh</td>
                      <td>{new Date(bill.due_date).toLocaleDateString()}</td>
                      <td>${bill.amount.toFixed(2)}</td>
                      <td>
                        <span className={statusPillClass(bill.status)}>
                          <span className="pill-dot"></span>
                          {bill.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {bill.status === "pending" && (
                          <motion.button
                            className="auth-button owner-submit-button"
                            onClick={() => handleMarkPaid(bill.id)}
                            whileTap={{ scale: 0.97 }}
                          >
                            Mark Paid
                          </motion.button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.section>

        <motion.section
          id="add-manager"
          className="dash-card admin-section"
          {...cardEntrance(7)}
          whileHover={cardHover}
        >
          <h2 className="dash-card-title">
            <UserPlus size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> Add Manager
          </h2>
          <form onSubmit={handleAddManager} className="admin-manager-form">
            <input
              className="auth-input"
              type="text"
              placeholder="Name"
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
            />
            <input
              className="auth-input"
              type="email"
              placeholder="Email"
              value={managerEmail}
              onChange={(e) => setManagerEmail(e.target.value)}
            />
            <input
              className="auth-input"
              type="password"
              placeholder="Password"
              value={managerPassword}
              onChange={(e) => setManagerPassword(e.target.value)}
            />
            <motion.button
              className="auth-button"
              type="submit"
              whileTap={{ scale: 0.97 }}
            >
              Add Manager
            </motion.button>
            {managerMessage && <p className="dash-success">{managerMessage}</p>}
            {managerError && <p className="dash-error">{managerError}</p>}
          </form>
        </motion.section>

        <motion.section
          id="pricing"
          className="dash-card admin-section"
          {...cardEntrance(8)}
          whileHover={cardHover}
        >
          <h2 className="dash-card-title">
            <DollarSign size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> Pricing Control
          </h2>
          <p className="dash-label">CURRENT PRICE PER AMPERE</p>
          <p className="dash-value-lg">
            {tariffPrice !== null ? `$${tariffPrice.toFixed(2)}` : "Loading..."}
          </p>
          <form onSubmit={handleUpdateTariff} className="admin-manager-form">
            <input
              className="auth-input"
              type="number"
              step="0.01"
              placeholder="Price per ampere"
              value={tariffInput}
              onChange={(e) => setTariffInput(e.target.value)}
            />
            <motion.button
              className="auth-button"
              type="submit"
              whileTap={{ scale: 0.97 }}
            >
              Update Price
            </motion.button>
            {tariffMessage && <p className="dash-success">{tariffMessage}</p>}
            {tariffError && <p className="dash-error">{tariffError}</p>}
          </form>
        </motion.section>

        <motion.section
          id="account-settings"
          className="dash-card admin-section"
          {...cardEntrance(9)}
          whileHover={cardHover}
        >
          <h2 className="dash-card-title">
            <User size={18} className="dash-icon" style={{ color: "var(--color-cyan)" }} /> Account Settings
          </h2>

          <hr className="dash-divider" />
          <p className="dash-label">PROFILE</p>
          {!isEditingProfile ? (
            <>
              <p className="dash-value-lg">{selfUser?.name || "—"}</p>
              <p className="bill-date">{selfUser?.email || "—"}</p>
              <motion.button
                className="dash-button-outline"
                onClick={handleStartEditProfile}
                whileTap={{ scale: 0.97 }}
              >
                <Pencil size={14} /> Edit Profile
              </motion.button>
            </>
          ) : (
            <form onSubmit={handleSaveProfile}>
              <input
                className="auth-input"
                type="text"
                placeholder="Name"
                value={editProfileName}
                onChange={(e) => setEditProfileName(e.target.value)}
              />
              <input
                className="auth-input"
                type="email"
                placeholder="Email"
                value={editProfileEmail}
                onChange={(e) => setEditProfileEmail(e.target.value)}
              />
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <motion.button
                  className="dash-button"
                  type="submit"
                  whileTap={{ scale: 0.97 }}
                  style={{ flex: 1 }}
                >
                  Save
                </motion.button>
                <motion.button
                  className="dash-button-outline"
                  type="button"
                  onClick={handleCancelEditProfile}
                  whileTap={{ scale: 0.97 }}
                  style={{ flex: 1, marginTop: 0 }}
                >
                  Cancel
                </motion.button>
              </div>
            </form>
          )}
          {profileMessage && <p className="dash-success">{profileMessage}</p>}
          {profileError && <p className="dash-error">{profileError}</p>}

          <hr className="dash-divider" />
          <p className="dash-label">PASSWORD</p>
          {!isChangingPassword ? (
            <motion.button
              className="dash-button-outline"
              onClick={handleStartChangePassword}
              whileTap={{ scale: 0.97 }}
            >
              <Lock size={14} /> Change Password
            </motion.button>
          ) : (
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
                  whileTap={{ scale: 0.97 }}
                  style={{ flex: 1 }}
                >
                  Save
                </motion.button>
                <motion.button
                  className="dash-button-outline"
                  type="button"
                  onClick={handleCancelChangePassword}
                  whileTap={{ scale: 0.97 }}
                  style={{ flex: 1, marginTop: 0 }}
                >
                  Cancel
                </motion.button>
              </div>
            </form>
          )}
          {passwordMessage && <p className="dash-success">{passwordMessage}</p>}
          {passwordError && <p className="dash-error">{passwordError}</p>}
        </motion.section>
      </main>
    </div>
  );
}

export default AdminDashboard;
