import { useEffect, useState, FormEvent, CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, animate } from "framer-motion";
import { Zap, BarChart3, Receipt, MessageCircle, LogOut, Sparkles, User, Pencil, Lock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { isAxiosError } from "axios";
import api from "../services/api";

interface CurrentUser {
  id: string;
  role: string;
}

interface Subscription {
  id: string;
  subscriber_id: string;
  generator_name: string;
  ampere: number;
  tariff_rate: number;
  status: string;
  address: string;
  phone: string;
  unit_number: string;
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
}

interface Prediction {
  prediction: number | null;
  message: string;
}

function statusPillClass(status: string): string {
  switch (status) {
    case "active":
    case "resolved":
    case "paid":
      return "pill pill-success";
    case "pending":
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
  { id: "subscription", label: "Subscription", icon: Zap },
  { id: "chart", label: "Consumption Chart", icon: BarChart3 },
  { id: "forecast", label: "AI Forecast", icon: Sparkles },
  { id: "billing", label: "Billing History", icon: Receipt },
  { id: "report-issue", label: "Report Issue", icon: MessageCircle },
];

const navContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } },
};

const navItemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

function Dashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [activeNavIndex, setActiveNavIndex] = useState(0);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [hasSubscription, setHasSubscription] = useState(true);
  const [bills, setBills] = useState<Bill[]>([]);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [issueDescription, setIssueDescription] = useState("");
  const [issueMessage, setIssueMessage] = useState("");
  const [issueError, setIssueError] = useState("");
  const [displayedForecast, setDisplayedForecast] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editAddress, setEditAddress] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editUnitNumber, setEditUnitNumber] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [editError, setEditError] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
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

  useEffect(() => {
    api.get("/me").then((response) => setCurrentUser(response.data));

    api
      .get("/subscription/me")
      .then((response) => setSubscription(response.data))
      .catch((err) => {
        if (isAxiosError(err) && err.response?.status === 404) {
          setHasSubscription(false);
        }
      });

    api.get("/bills/me").then((response) => setBills(response.data));

    api.get("/bills/predict").then((response) => setPrediction(response.data));
  }, []);

  useEffect(() => {
    if (prediction?.prediction == null) return;

    const controls = animate(0, prediction.prediction, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (latest) => setDisplayedForecast(latest),
    });

    return () => controls.stop();
  }, [prediction?.prediction]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleReportIssue = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIssueMessage("");
    setIssueError("");

    try {
      await api.post("/issues", { description: issueDescription });
      setIssueMessage("Issue reported successfully");
      setIssueDescription("");
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        setIssueError(err.response.data.detail);
      } else {
        setIssueError("Failed to report issue");
      }
    }
  };

  const handleStartEditing = () => {
    if (!subscription) return;
    setEditAddress(subscription.address);
    setEditPhone(subscription.phone);
    setEditUnitNumber(subscription.unit_number);
    setEditMessage("");
    setEditError("");
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditError("");
  };

  const handleSaveEditing = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEditMessage("");
    setEditError("");

    try {
      const response = await api.patch("/subscription/me", {
        address: editAddress,
        phone: editPhone,
        unit_number: editUnitNumber,
      });
      setSubscription(response.data);
      setIsEditing(false);
      setEditMessage("Subscription details updated successfully");
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        setEditError(err.response.data.detail);
      } else {
        setEditError("Failed to update subscription details");
      }
    }
  };

  const handleStartEditProfile = () => {
    setEditProfileName(profileName);
    setEditProfileEmail(profileEmail);
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
      setProfileName(response.data.name);
      setProfileEmail(response.data.email);
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

  const displayName = currentUser
    ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)
    : "";
  const avatarInitial = currentUser ? currentUser.role.charAt(0).toUpperCase() : "";

  const totalConsumption = bills.reduce((sum, bill) => sum + bill.consumption_kwh, 0);
  const currentBalance = bills
    .filter((bill) => bill.status === "pending")
    .reduce((sum, bill) => sum + bill.amount, 0);

  const highestBillAmount = bills.reduce((max, bill) => Math.max(max, bill.amount), 0);
  const forecastPercent =
    prediction?.prediction != null && highestBillAmount > 0
      ? Math.min(100, (prediction.prediction / highestBillAmount) * 100)
      : 0;
  const forecastBarStyle = {
    "--fill-width": `${forecastPercent}%`,
  } as CSSProperties;

  const chartData = [...bills].reverse().map((bill) => ({
    date: new Date(bill.created_at).toLocaleDateString(),
    consumption_kwh: bill.consumption_kwh,
  }));

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
        <div className="dash-header">
          <div className="dash-greeting">
            <p className="dash-greeting-text">Hello, {displayName}</p>
            {subscription && (
              <span className="pill pill-success pill-live">
                {subscription.ampere}A ACTIVE
              </span>
            )}
          </div>
          <div className="dash-avatar">{avatarInitial}</div>
        </div>

        <motion.div
          id="subscription"
          className="dash-card admin-section"
          style={{ animation: "none" }}
          {...cardEntrance(0)}
          whileHover={cardHover}
        >
          <h2 className="dash-card-title">
            <Zap size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> My Subscription
          </h2>
          {subscription ? (
            <>
              <p className="dash-label">ASSIGNED GENERATOR</p>
              <p className="dash-value-lg">{subscription.generator_name}</p>
              <hr className="dash-divider" />
              <div className="dash-cols">
                <div className="dash-col">
                  <p className="dash-label">TIER</p>
                  <p className="dash-value-lg">{subscription.ampere} Amperes</p>
                </div>
                <div className="dash-col">
                  <p className="dash-label">STATUS</p>
                  <span className={statusPillClass(subscription.status)}>
                    {subscription.status.toUpperCase()}
                  </span>
                </div>
              </div>
              <hr className="dash-divider" />
              {!isEditing ? (
                <>
                  <div className="dash-cols">
                    <div className="dash-col">
                      <p className="dash-label">ADDRESS</p>
                      <p className="dash-value-lg">{subscription.address}</p>
                    </div>
                    <div className="dash-col">
                      <p className="dash-label">PHONE</p>
                      <p className="dash-value-lg">{subscription.phone}</p>
                    </div>
                    <div className="dash-col">
                      <p className="dash-label">UNIT</p>
                      <p className="dash-value-lg">{subscription.unit_number}</p>
                    </div>
                  </div>
                  <motion.button
                    className="dash-button-outline"
                    onClick={handleStartEditing}
                    whileTap={{ scale: 0.97 }}
                  >
                    Edit Details
                  </motion.button>
                </>
              ) : (
                <form onSubmit={handleSaveEditing}>
                  <input
                    className="auth-input"
                    type="text"
                    placeholder="Address"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                  />
                  <input
                    className="auth-input"
                    type="tel"
                    placeholder="Phone"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                  <input
                    className="auth-input"
                    type="text"
                    placeholder="Apt/Unit number"
                    value={editUnitNumber}
                    onChange={(e) => setEditUnitNumber(e.target.value)}
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
                      onClick={handleCancelEditing}
                      whileTap={{ scale: 0.97 }}
                      style={{ flex: 1, marginTop: 0 }}
                    >
                      Cancel
                    </motion.button>
                  </div>
                </form>
              )}
              {editMessage && <p className="dash-success">{editMessage}</p>}
              {editError && <p className="dash-error">{editError}</p>}
            </>
          ) : hasSubscription ? (
            <p>Loading...</p>
          ) : (
            <>
              <p>No subscription yet</p>
              <Link className="dash-button" to="/subscribe" style={{ display: "block", textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
                Subscribe Now
              </Link>
            </>
          )}
        </motion.div>

        <div className="admin-stats-grid">
          <motion.div
            className="stat-card stat-card-cyan"
            style={{ animation: "none" }}
            {...cardEntrance(1)}
            whileHover={cardHover}
          >
            <p className="dash-label">
              <BarChart3 size={18} className="dash-icon" style={{ color: "var(--color-cyan)" }} /> TOTAL CONSUMPTION
            </p>
            <p className="stat-number-cyan">{totalConsumption} kWh</p>
          </motion.div>
          <motion.div
            className="stat-card stat-card-amber"
            style={{ animation: "none" }}
            {...cardEntrance(2)}
            whileHover={cardHover}
          >
            <p className="dash-label">CURRENT BALANCE</p>
            <p className="stat-number-amber">{currentBalance.toFixed(2)} USD</p>
          </motion.div>
        </div>

        <motion.div
          id="chart"
          className="dash-card admin-section"
          style={{ animation: "none" }}
          {...cardEntrance(3)}
          whileHover={cardHover}
        >
          <h2 className="dash-card-title">
            <BarChart3 size={18} className="dash-icon" style={{ color: "var(--color-cyan)" }} /> Consumption Trend
          </h2>
          {bills.length < 2 ? (
            <p className="forecast-message">Chart will appear once you have more billing history</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} />
                <YAxis hide={true} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-surface-2)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    color: "var(--color-text)",
                  }}
                />
                <Bar dataKey="consumption_kwh" fill="var(--color-cyan)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        <motion.div
          id="forecast"
          className="dash-card forecast-card admin-section"
          style={{ animation: "none" }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          whileHover={cardHover}
        >
          <p className="forecast-label">
            <Sparkles size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> AI FORECAST
          </p>
          {prediction && prediction.prediction !== null ? (
            <>
              <p className="forecast-amount">${displayedForecast.toFixed(2)}</p>
              <p className="forecast-message">{prediction.message}</p>
              <div className="forecast-bar-track">
                <div className="forecast-bar-fill" style={forecastBarStyle}></div>
              </div>
            </>
          ) : (
            <p className="forecast-message">{prediction?.message ?? "Loading..."}</p>
          )}
        </motion.div>

        <motion.div
          id="billing"
          className="dash-card admin-section"
          style={{ animation: "none" }}
          {...cardEntrance(4)}
          whileHover={cardHover}
        >
          <h2 className="dash-card-title">
            <Receipt size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> Billing History
          </h2>
          {bills.length === 0 ? (
            <p>No bills yet</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>kWh</th>
                    <th>Date</th>
                    <th>Due Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((bill) => (
                    <tr key={bill.id}>
                      <td>{bill.consumption_kwh} kWh</td>
                      <td>{new Date(bill.created_at).toLocaleDateString()}</td>
                      <td>{new Date(bill.due_date).toLocaleDateString()}</td>
                      <td>${bill.amount.toFixed(2)}</td>
                      <td>
                        <span className={statusPillClass(bill.status)}>
                          <span className="pill-dot"></span>
                          {bill.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        <motion.div
          id="report-issue"
          className="dash-card admin-section"
          style={{ animation: "none" }}
          {...cardEntrance(5)}
          whileHover={cardHover}
        >
          <h2 className="dash-card-title">
            <MessageCircle size={18} className="dash-icon" style={{ color: "var(--color-cyan)" }} /> Report an Issue
          </h2>
          <form onSubmit={handleReportIssue}>
            <textarea
              className="dash-textarea"
              placeholder="Describe the issue..."
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              rows={3}
            />
            <motion.button className="dash-button" type="submit" whileTap={{ scale: 0.97 }}>
              Submit Report
            </motion.button>
            {issueMessage && <p className="dash-success">{issueMessage}</p>}
            {issueError && <p className="dash-error">{issueError}</p>}
          </form>
        </motion.div>

        <motion.section
          id="account-settings"
          className="dash-card admin-section"
          {...cardEntrance(6)}
          whileHover={cardHover}
        >
          <h2 className="dash-card-title">
            <User size={18} className="dash-icon" style={{ color: "var(--color-cyan)" }} /> Account Settings
          </h2>

          <hr className="dash-divider" />
          <p className="dash-label">PROFILE</p>
          {!isEditingProfile ? (
            <>
              <p className="dash-value-lg">{profileName || "—"}</p>
              <p className="bill-date">{profileEmail || "—"}</p>
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

export default Dashboard;
