import { useEffect, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Zap, Receipt, ShieldCheck, BarChart3, LogOut, UserPlus } from "lucide-react";
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
}

interface Bill {
  id: string;
  subscriber_id: string;
  meter_reading_id: string;
  consumption_kwh: number;
  amount: number;
  status: string;
  created_at: string;
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

function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [managerName, setManagerName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [managerPassword, setManagerPassword] = useState("");
  const [managerMessage, setManagerMessage] = useState("");
  const [managerError, setManagerError] = useState("");

  const fetchUsers = () => {
    api.get("/admin/users").then((response) => setUsers(response.data));
  };

  useEffect(() => {
    fetchUsers();
    api
      .get("/admin/subscriptions")
      .then((response) => setSubscriptions(response.data));
    api.get("/admin/bills").then((response) => setBills(response.data));
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

  const roleCounts = ["subscriber", "owner", "admin"].map((role) => ({
    role: displayRole(role).charAt(0).toUpperCase() + displayRole(role).slice(1),
    count: users.filter((user) => user.role === role).length,
  }));

  return (
    <div className="dash-page">
      <div className="dash-content">
        <div className="dash-logo">⚡ WattShare</div>
        <div className="dash-page-title">
          <ShieldCheck size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> Admin Dashboard
        </div>

        <motion.div
          className="dash-card"
          style={{ animation: "none" }}
          {...cardEntrance(0)}
          whileHover={cardHover}
        >
          <h2 className="dash-card-title">
            <Users size={18} className="dash-icon" style={{ color: "var(--color-cyan)" }} /> Users
          </h2>
          {users.length === 0 ? (
            <p>No data yet</p>
          ) : (
            <div>
              {users.map((user) => (
                <div className="bill-row" key={user.id}>
                  <div>
                    <p className="bill-kwh">{user.name}</p>
                    <p className="bill-date">{user.email}</p>
                  </div>
                  <span className={statusPillClass(user.role)}>
                    <span className="pill-dot"></span>
                    {displayRole(user.role).toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          className="dash-card"
          style={{ animation: "none" }}
          {...cardEntrance(1)}
          whileHover={cardHover}
        >
          <h2 className="dash-card-title">
            <UserPlus size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> Add Manager
          </h2>
          <form onSubmit={handleAddManager}>
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
        </motion.div>

        <motion.div
          className="dash-card"
          style={{ animation: "none" }}
          {...cardEntrance(2)}
          whileHover={cardHover}
        >
          <h2 className="dash-card-title">
            <BarChart3 size={18} className="dash-icon" style={{ color: "var(--color-cyan)" }} /> Users by Role
          </h2>
          {users.length === 0 ? (
            <p className="forecast-message">Chart will appear once users register</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
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

        <motion.div
          className="dash-card"
          style={{ animation: "none" }}
          {...cardEntrance(3)}
          whileHover={cardHover}
        >
          <h2 className="dash-card-title">
            <Zap size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> Subscriptions
          </h2>
          {subscriptions.length === 0 ? (
            <p>No data yet</p>
          ) : (
            <div>
              {subscriptions.map((subscription) => (
                <div className="bill-row" key={subscription.id}>
                  <div>
                    <p className="bill-kwh">{subscription.subscriber_id}</p>
                    <p className="bill-date">{subscription.ampere}A</p>
                  </div>
                  <span className={statusPillClass(subscription.status)}>
                    <span className="pill-dot"></span>
                    {subscription.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          className="dash-card"
          style={{ animation: "none" }}
          {...cardEntrance(4)}
          whileHover={cardHover}
        >
          <h2 className="dash-card-title">
            <Receipt size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> Bills
          </h2>
          {bills.length === 0 ? (
            <p>No data yet</p>
          ) : (
            <div>
              {bills.map((bill) => (
                <div className="bill-row" key={bill.id}>
                  <div>
                    <p className="bill-kwh">{bill.consumption_kwh} kWh</p>
                    <p className="bill-date">{bill.subscriber_id}</p>
                  </div>
                  <div className="bill-amount-wrap">
                    <p className="bill-amount">${bill.amount.toFixed(2)}</p>
                    <span className={statusPillClass(bill.status)}>
                      <span className="pill-dot"></span>
                      {bill.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.button
          className="dash-button-logout"
          onClick={handleLogout}
          whileTap={{ scale: 0.97 }}
        >
          <LogOut size={18} /> Log Out
        </motion.button>
      </div>
    </div>
  );
}

export default AdminDashboard;
