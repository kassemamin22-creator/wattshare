import { useEffect, useState, type FormEvent, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { motion, animate, AnimatePresence } from "framer-motion";
import { Users, Zap, Receipt, ShieldCheck, BarChart3, LogOut, UserPlus, DollarSign, Trash2, User, Pencil, Lock, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { isAxiosError } from "axios";
import api from "../services/api";
import { useToast } from "../hooks/useToast";
import ConfirmModal from "../components/ConfirmModal";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  subscription_status?: string | null;
}

interface Subscription {
  id: string;
  subscriber_id: string;
  generator_name: string;
  ampere: number;
  tariff_rate: number;
  status: string;
  address: string;
  building: string;
  phone: string;
  unit_number: string;
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

interface Revenue {
  total_collected: number;
  total_outstanding: number;
  paid_count: number;
  outstanding_count: number;
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
    case "none":
      return "pill pill-muted";
    default:
      return "pill pill-cyan";
  }
}

const CARD_STAGGER = 0.08;
const cardHover = {
  scale: 1.015,
  y: -4,
  boxShadow: "0 14px 32px rgba(0, 0, 0, 0.45)",
  transition: { type: "spring" as const, stiffness: 300, damping: 20 },
};

function cardEntrance(index: number) {
  return {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay: index * CARD_STAGGER, ease: "easeOut" as const },
  };
}

function rowEntrance(index: number) {
  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, delay: index * 0.04, ease: "easeOut" as const },
  };
}

const rowHover = { scale: 1.01 };

interface CountUpValueProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

function CountUpValue({ value, decimals = 0, prefix = "", suffix = "" }: CountUpValueProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(0, value, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (latest) => setDisplayValue(latest),
    });

    return () => controls.stop();
  }, [value]);

  return (
    <>
      {prefix}
      {displayValue.toFixed(decimals)}
      {suffix}
    </>
  );
}

const NAV_ITEMS = [
  { id: "users", label: "Users", icon: Users },
  { id: "subscriptions", label: "Subscriptions", icon: Zap },
  { id: "bills", label: "Bills", icon: Receipt },
  { id: "add-manager", label: "Add Manager", icon: UserPlus },
  { id: "add-subscriber", label: "Add Subscriber", icon: UserPlus },
  { id: "pricing", label: "Pricing", icon: DollarSign },
];

const SUBSCRIBER_PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "whish", label: "Whish" },
  { value: "omt", label: "OMT" },
];

const navContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } },
};

const navItemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

function AdminDashboard() {
  const navigate = useNavigate();
  const showToast = useToast();
  const [currentUserId, setCurrentUserId] = useState("");
  const [activeNavIndex, setActiveNavIndex] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [revenue, setRevenue] = useState<Revenue | null>(null);
  const [managerName, setManagerName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [managerPassword, setManagerPassword] = useState("");
  const [isAddingManager, setIsAddingManager] = useState(false);
  const [subscriberName, setSubscriberName] = useState("");
  const [subscriberEmail, setSubscriberEmail] = useState("");
  const [subscriberPassword, setSubscriberPassword] = useState("");
  const [subscriberAddress, setSubscriberAddress] = useState("");
  const [subscriberBuilding, setSubscriberBuilding] = useState("");
  const [subscriberPhone, setSubscriberPhone] = useState("");
  const [subscriberUnitNumber, setSubscriberUnitNumber] = useState("");
  const [subscriberAmpere, setSubscriberAmpere] = useState("");
  const [subscriberPaymentMethod, setSubscriberPaymentMethod] = useState("cash");
  const [isAddingSubscriber, setIsAddingSubscriber] = useState(false);
  const [tariffPrice, setTariffPrice] = useState<number | null>(null);
  const [tariffInput, setTariffInput] = useState("");
  const [isUpdatingTariff, setIsUpdatingTariff] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserRole, setEditUserRole] = useState("subscriber");
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [userPendingDelete, setUserPendingDelete] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [togglingSubscriptionId, setTogglingSubscriptionId] = useState<string | null>(null);
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState<"active" | "all" | "pending" | "inactive">("active");
  const [editingSubscriptionId, setEditingSubscriptionId] = useState<string | null>(null);
  const [editSubscriptionAddress, setEditSubscriptionAddress] = useState("");
  const [editSubscriptionBuilding, setEditSubscriptionBuilding] = useState("");
  const [editSubscriptionPhone, setEditSubscriptionPhone] = useState("");
  const [editSubscriptionUnitNumber, setEditSubscriptionUnitNumber] = useState("");
  const [editSubscriptionAmpere, setEditSubscriptionAmpere] = useState("");
  const [isSavingSubscription, setIsSavingSubscription] = useState(false);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileName, setEditProfileName] = useState("");
  const [editProfileEmail, setEditProfileEmail] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const selfUser = users.find((user) => user.id === currentUserId);

  const fetchUsers = () => {
    api.get("/admin/users").then((response) => setUsers(response.data));
  };

  const fetchSubscriptions = () => {
    api.get("/admin/subscriptions").then((response) => setSubscriptions(response.data));
  };

  const fetchRevenue = () => {
    api.get("/admin/revenue").then((response) => setRevenue(response.data));
  };

  useEffect(() => {
    api.get("/me").then((response) => setCurrentUserId(response.data.id));
    fetchUsers();
    fetchSubscriptions();
    fetchRevenue();
    api.get("/admin/bills").then((response) => setBills(response.data));
    api.get("/tariff").then((response) => {
      setTariffPrice(response.data.price_per_ampere);
      setTariffInput(String(response.data.price_per_ampere));
    });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleAddManager = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsAddingManager(true);

    try {
      await api.post("/admin/add-manager", {
        name: managerName,
        email: managerEmail,
        password: managerPassword,
      });
      showToast("Manager account created successfully", "success");
      setManagerName("");
      setManagerEmail("");
      setManagerPassword("");
      fetchUsers();
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        showToast(err.response.data.detail, "error");
      } else {
        showToast("Failed to create manager account", "error");
      }
    } finally {
      setIsAddingManager(false);
    }
  };

  const handleAddSubscriber = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsAddingSubscriber(true);

    try {
      await api.post("/admin/add-subscriber", {
        name: subscriberName,
        email: subscriberEmail,
        password: subscriberPassword,
        address: subscriberAddress,
        building: subscriberBuilding,
        phone: subscriberPhone,
        unit_number: subscriberUnitNumber,
        ampere: Number(subscriberAmpere),
        payment_method: subscriberPaymentMethod,
      });
      showToast("Subscriber account created successfully", "success");
      setSubscriberName("");
      setSubscriberEmail("");
      setSubscriberPassword("");
      setSubscriberAddress("");
      setSubscriberBuilding("");
      setSubscriberPhone("");
      setSubscriberUnitNumber("");
      setSubscriberAmpere("");
      setSubscriberPaymentMethod("cash");
      fetchUsers();
      fetchSubscriptions();
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        showToast(err.response.data.detail, "error");
      } else {
        showToast("Failed to create subscriber account", "error");
      }
    } finally {
      setIsAddingSubscriber(false);
    }
  };

  const handleUpdateTariff = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUpdatingTariff(true);

    try {
      const response = await api.put("/admin/tariff", {
        price_per_ampere: Number(tariffInput),
      });
      setTariffPrice(response.data.price_per_ampere);
      showToast("Price updated successfully", "success");
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        showToast(err.response.data.detail, "error");
      } else {
        showToast("Failed to update price", "error");
      }
    } finally {
      setIsUpdatingTariff(false);
    }
  };

  const handleMarkPaid = async (billId: string) => {
    setMarkingPaidId(billId);
    try {
      await api.patch(`/bills/${billId}/mark-paid`);
      setBills((prev) =>
        prev.map((bill) => (bill.id === billId ? { ...bill, status: "paid" } : bill))
      );
      fetchRevenue();
    } catch {
      // mark-paid failed; leave the bill status as-is
    } finally {
      setMarkingPaidId(null);
    }
  };

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

  const handleToggleSubscriptionStatus = async (subscriptionId: string) => {
    setTogglingSubscriptionId(subscriptionId);
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
    } finally {
      setTogglingSubscriptionId(null);
    }
  };

  const handleStartEditSubscription = (subscription: Subscription) => {
    setEditingSubscriptionId(subscription.id);
    setEditSubscriptionAddress(subscription.address);
    setEditSubscriptionBuilding(subscription.building);
    setEditSubscriptionPhone(subscription.phone);
    setEditSubscriptionUnitNumber(subscription.unit_number);
    setEditSubscriptionAmpere(String(subscription.ampere));
  };

  const handleCancelEditSubscription = () => {
    setEditingSubscriptionId(null);
  };

  const handleSaveEditSubscription = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingSubscriptionId) return;

    setIsSavingSubscription(true);

    try {
      await api.patch(`/admin/subscriptions/${editingSubscriptionId}`, {
        address: editSubscriptionAddress,
        building: editSubscriptionBuilding,
        phone: editSubscriptionPhone,
        unit_number: editSubscriptionUnitNumber,
        ampere: Number(editSubscriptionAmpere),
      });
      showToast("Subscription updated successfully", "success");
      setEditingSubscriptionId(null);
      fetchSubscriptions();
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        showToast(err.response.data.detail, "error");
      } else {
        showToast("Failed to update subscription", "error");
      }
    } finally {
      setIsSavingSubscription(false);
    }
  };

  const handleStartEditProfile = () => {
    setEditProfileName(selfUser?.name || "");
    setEditProfileEmail(selfUser?.email || "");
    setIsEditingProfile(true);
  };

  const handleCancelEditProfile = () => {
    setIsEditingProfile(false);
  };

  const handleSaveProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSavingProfile(true);

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
      showToast("Profile updated successfully", "success");
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        showToast(err.response.data.detail, "error");
      } else {
        showToast("Failed to update profile", "error");
      }
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

  const roleCounts = ["subscriber", "owner", "admin"].map((role) => ({
    role: displayRole(role).charAt(0).toUpperCase() + displayRole(role).slice(1),
    count: users.filter((user) => user.role === role).length,
  }));

  const filteredSubscriptions = subscriptions.filter(
    (subscription) => subscriptionStatusFilter === "all" || subscription.status === subscriptionStatusFilter
  );

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <span className="admin-sidebar-logo-bolt">⚡</span> WattShare
        </div>
        <motion.nav
          className="admin-nav"
          variants={navContainerVariants}
          initial="hidden"
          animate="visible"
        >
          {NAV_ITEMS.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeNavIndex === index;
            return (
              <motion.a
                key={item.id}
                href={`#${item.id}`}
                className={isActive ? "admin-nav-link is-active" : "admin-nav-link"}
                onClick={() => setActiveNavIndex(index)}
                variants={navItemVariants}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {isActive && (
                  <motion.span
                    layoutId="admin-nav-active-pill"
                    className="admin-nav-pill"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <motion.span
                  className="admin-nav-icon"
                  whileHover={{ rotate: -10, scale: 1.15 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                  <Icon size={18} />
                </motion.span>
                <span className="admin-nav-label">{item.label}</span>
              </motion.a>
            );
          })}
        </motion.nav>
        <motion.button
          className="dash-button-logout"
          onClick={handleLogout}
          whileHover={{ scale: 1.03 }}
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

        <div className="dash-page-title" style={{ fontSize: "1rem", marginTop: "0.5rem" }}>
          <DollarSign size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> Revenue Overview
        </div>

        <div className="admin-stats-grid">
          <motion.div
            className="stat-card stat-card-amber"
            {...cardEntrance(11)}
            whileHover={cardHover}
          >
            <p className="dash-label">Total Collected</p>
            <p className="stat-number-amber">
              <CountUpValue value={revenue?.total_collected ?? 0} decimals={2} prefix="$" />
            </p>
          </motion.div>

          <motion.div
            className="stat-card stat-card-cyan"
            {...cardEntrance(12)}
            whileHover={cardHover}
          >
            <p className="dash-label">Outstanding</p>
            <p className="stat-number-cyan">
              <CountUpValue value={revenue?.total_outstanding ?? 0} decimals={2} prefix="$" />
            </p>
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

        <motion.section
          id="subscriptions"
          className="dash-card admin-section"
          {...cardEntrance(5)}
          whileHover={cardHover}
        >
          <h2 className="dash-card-title">
            <Zap size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> Subscriptions
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <p className="dash-label" style={{ margin: 0 }}>STATUS</p>
            <select
              className="owner-select"
              value={subscriptionStatusFilter}
              onChange={(e) =>
                setSubscriptionStatusFilter(e.target.value as "active" | "all" | "pending" | "inactive")
              }
              style={{ flex: "0 1 160px" }}
            >
              <option value="active">Active</option>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          {subscriptions.length === 0 ? (
            <p>No data yet</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Subscriber</th>
                    <th>Address</th>
                    <th>Building</th>
                    <th>Phone</th>
                    <th>Unit</th>
                    <th>Ampere</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubscriptions.map((subscription, index) => (
                    <Fragment key={subscription.id}>
                      <motion.tr {...rowEntrance(index)} whileHover={rowHover}>
                        <td>{subscription.subscriber_name || subscription.subscriber_id}</td>
                        <td>{subscription.address}</td>
                        <td>{subscription.building}</td>
                        <td>{subscription.phone}</td>
                        <td>{subscription.unit_number}</td>
                        <td>{subscription.ampere}A</td>
                        <td>
                          <span className={statusPillClass(subscription.status)}>
                            <span className="pill-dot"></span>
                            {subscription.status.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <motion.button
                              className="dash-button-outline"
                              onClick={() => handleStartEditSubscription(subscription)}
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              style={{ marginTop: 0, width: "auto", padding: "0.5rem 0.75rem" }}
                            >
                              <Pencil size={14} />
                            </motion.button>
                            {subscription.status === "active" ? (
                              <motion.button
                                className="admin-mobile-logout"
                                onClick={() => handleToggleSubscriptionStatus(subscription.id)}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                disabled={togglingSubscriptionId === subscription.id}
                              >
                                {togglingSubscriptionId === subscription.id ? (
                                  <Loader2 size={14} className="btn-spinner" />
                                ) : (
                                  "Deactivate"
                                )}
                              </motion.button>
                            ) : (
                              <motion.button
                                className="auth-button owner-submit-button"
                                onClick={() => handleToggleSubscriptionStatus(subscription.id)}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                disabled={togglingSubscriptionId === subscription.id}
                              >
                                {togglingSubscriptionId === subscription.id ? (
                                  <Loader2 size={14} className="btn-spinner" />
                                ) : (
                                  "Activate"
                                )}
                              </motion.button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                      <AnimatePresence initial={false}>
                        {editingSubscriptionId === subscription.id && (
                          <motion.tr
                            key="edit-row"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <td colSpan={8}>
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: "easeInOut" }}
                                style={{ overflow: "hidden" }}
                              >
                                <form
                                  onSubmit={handleSaveEditSubscription}
                                  style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}
                                >
                                  <input
                                    className="auth-input"
                                    type="text"
                                    placeholder="Address"
                                    value={editSubscriptionAddress}
                                    onChange={(e) => setEditSubscriptionAddress(e.target.value)}
                                    style={{ flex: "1 1 160px", marginBottom: 0 }}
                                  />
                                  <input
                                    className="auth-input"
                                    type="text"
                                    placeholder="Building name or number"
                                    value={editSubscriptionBuilding}
                                    onChange={(e) => setEditSubscriptionBuilding(e.target.value)}
                                    style={{ flex: "1 1 160px", marginBottom: 0 }}
                                  />
                                  <input
                                    className="auth-input"
                                    type="tel"
                                    placeholder="Phone"
                                    value={editSubscriptionPhone}
                                    onChange={(e) => setEditSubscriptionPhone(e.target.value)}
                                    style={{ flex: "1 1 160px", marginBottom: 0 }}
                                  />
                                  <input
                                    className="auth-input"
                                    type="text"
                                    placeholder="Apt/Unit number"
                                    value={editSubscriptionUnitNumber}
                                    onChange={(e) => setEditSubscriptionUnitNumber(e.target.value)}
                                    style={{ flex: "1 1 160px", marginBottom: 0 }}
                                  />
                                  <input
                                    className="auth-input"
                                    type="number"
                                    placeholder="Ampere"
                                    value={editSubscriptionAmpere}
                                    onChange={(e) => setEditSubscriptionAmpere(e.target.value)}
                                    style={{ flex: "1 1 160px", marginBottom: 0 }}
                                  />
                                  <motion.button
                                    className="auth-button owner-submit-button"
                                    type="submit"
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    disabled={isSavingSubscription}
                                    style={{ marginTop: 0, width: "auto", padding: "0.6rem 1rem" }}
                                  >
                                    {isSavingSubscription ? <Loader2 size={14} className="btn-spinner" /> : "Save"}
                                  </motion.button>
                                  <motion.button
                                    className="dash-button-outline"
                                    type="button"
                                    onClick={handleCancelEditSubscription}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    style={{ marginTop: 0, width: "auto", padding: "0.6rem 1rem" }}
                                  >
                                    Cancel
                                  </motion.button>
                                </form>
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
                  {bills.map((bill, index) => (
                    <motion.tr key={bill.id} {...rowEntrance(index)} whileHover={rowHover}>
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
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            disabled={markingPaidId === bill.id}
                          >
                            {markingPaidId === bill.id ? (
                              <Loader2 size={14} className="btn-spinner" />
                            ) : (
                              "Mark Paid"
                            )}
                          </motion.button>
                        )}
                      </td>
                    </motion.tr>
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
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              disabled={isAddingManager}
            >
              {isAddingManager ? <Loader2 size={16} className="btn-spinner" /> : "Add Manager"}
            </motion.button>
          </form>
        </motion.section>

        <motion.section
          id="add-subscriber"
          className="dash-card admin-section"
          {...cardEntrance(10)}
          whileHover={cardHover}
        >
          <h2 className="dash-card-title">
            <UserPlus size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> Add Subscriber
          </h2>
          <form onSubmit={handleAddSubscriber} className="admin-manager-form">
            <input
              className="auth-input"
              type="text"
              placeholder="Name"
              value={subscriberName}
              onChange={(e) => setSubscriberName(e.target.value)}
            />
            <input
              className="auth-input"
              type="email"
              placeholder="Email"
              value={subscriberEmail}
              onChange={(e) => setSubscriberEmail(e.target.value)}
            />
            <input
              className="auth-input"
              type="password"
              placeholder="Password"
              value={subscriberPassword}
              onChange={(e) => setSubscriberPassword(e.target.value)}
            />
            <input
              className="auth-input"
              type="text"
              placeholder="Address"
              value={subscriberAddress}
              onChange={(e) => setSubscriberAddress(e.target.value)}
            />
            <input
              className="auth-input"
              type="text"
              placeholder="Building name or number"
              value={subscriberBuilding}
              onChange={(e) => setSubscriberBuilding(e.target.value)}
            />
            <input
              className="auth-input"
              type="tel"
              placeholder="Phone"
              value={subscriberPhone}
              onChange={(e) => setSubscriberPhone(e.target.value)}
            />
            <input
              className="auth-input"
              type="text"
              placeholder="Apt/Unit number"
              value={subscriberUnitNumber}
              onChange={(e) => setSubscriberUnitNumber(e.target.value)}
            />
            <input
              className="auth-input"
              type="number"
              placeholder="Ampere"
              value={subscriberAmpere}
              onChange={(e) => setSubscriberAmpere(e.target.value)}
            />
            <p className="dash-label">Payment Method</p>
            <div className="payment-method-group">
              {SUBSCRIBER_PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  className={
                    subscriberPaymentMethod === method.value
                      ? "payment-method-pill payment-method-pill-active"
                      : "payment-method-pill"
                  }
                  onClick={() => setSubscriberPaymentMethod(method.value)}
                >
                  {method.label}
                </button>
              ))}
            </div>
            <motion.button
              className="auth-button"
              type="submit"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              disabled={isAddingSubscriber}
            >
              {isAddingSubscriber ? <Loader2 size={16} className="btn-spinner" /> : "Add Subscriber"}
            </motion.button>
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
            {tariffPrice !== null ? (
              <CountUpValue value={tariffPrice} decimals={2} prefix="$" />
            ) : (
              "Loading..."
            )}
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
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              disabled={isUpdatingTariff}
            >
              {isUpdatingTariff ? <Loader2 size={16} className="btn-spinner" /> : "Update Price"}
            </motion.button>
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
          {!isEditingProfile && (
            <>
              <p className="dash-value-lg">{selfUser?.name || "—"}</p>
              <p className="bill-date">{selfUser?.email || "—"}</p>
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
      </main>

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
    </div>
  );
}

export default AdminDashboard;
