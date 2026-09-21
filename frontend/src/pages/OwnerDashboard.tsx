import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, BarChart3, AlertCircle, Gauge, LogOut, Receipt, Search } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { isAxiosError } from "axios";
import api from "../services/api";

interface Subscriber {
  id: string;
  subscriber_id: string;
  generator_name: string;
  ampere: number;
  tariff_rate: number;
  status: string;
  address: string;
  phone: string;
  unit_number: string;
  subscriber_name?: string;
}

interface Issue {
  id: string;
  subscriber_id: string;
  description: string;
  status: string;
  created_at: string;
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

function statusPillClass(status: string): string {
  switch (status) {
    case "active":
    case "resolved":
      return "pill pill-success";
    case "pending":
    case "open":
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
  { id: "subscribers", label: "Subscribers", icon: Users },
  { id: "subscribers", label: "Meter Reading", icon: Gauge },
  { id: "issues", label: "Reported Issues", icon: AlertCircle },
  { id: "chart", label: "Consumption Chart", icon: BarChart3 },
  { id: "bills", label: "Bills", icon: Receipt },
];

const navContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } },
};

const navItemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

function OwnerDashboard() {
  const navigate = useNavigate();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [activeNavIndex, setActiveNavIndex] = useState(0);
  const [readingValues, setReadingValues] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [issues, setIssues] = useState<Issue[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [subscriberSearch, setSubscriberSearch] = useState("");

  useEffect(() => {
    api.get("/subscribers").then((response) => setSubscribers(response.data));
    api.get("/issues").then((response) => setIssues(response.data));
    api.get("/admin/bills").then((response) => setBills(response.data));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleReadingChange = (subscriberId: string, value: string) => {
    setReadingValues((prev) => ({ ...prev, [subscriberId]: value }));
  };

  const handleStatusChange = async (issueId: string, newStatus: string) => {
    try {
      await api.patch(`/issues/${issueId}?status=${newStatus}`);
      setIssues((prev) =>
        prev.map((issue) =>
          issue.id === issueId ? { ...issue, status: newStatus } : issue
        )
      );
    } catch {
      // status update failed; leave the dropdown as-is
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

  const handleSubmitReading = async (subscriberId: string) => {
    setMessages((prev) => ({ ...prev, [subscriberId]: "" }));
    setErrors((prev) => ({ ...prev, [subscriberId]: "" }));

    try {
      await api.post("/meter-reading", {
        subscriber_id: subscriberId,
        reading_value: Number(readingValues[subscriberId]),
      });
      setMessages((prev) => ({
        ...prev,
        [subscriberId]: "Reading submitted, bill generated",
      }));
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        setErrors((prev) => ({
          ...prev,
          [subscriberId]: err.response!.data.detail,
        }));
      } else {
        setErrors((prev) => ({
          ...prev,
          [subscriberId]: "Failed to submit reading",
        }));
      }
    }
  };

  const chartData = subscribers.map((subscriber, index) => ({
    label: `Sub ${index + 1}`,
    ampere: subscriber.ampere,
  }));

  const filteredSubscribers = subscribers.filter((subscriber) =>
    (subscriber.subscriber_name || "").toLowerCase().includes(subscriberSearch.toLowerCase())
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
                key={item.label}
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
          <Gauge size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> Manager Dashboard
        </div>

        <motion.section
          id="subscribers"
          className="dash-card admin-section"
          {...cardEntrance(0)}
          whileHover={cardHover}
        >
          <h2 className="dash-card-title">
            <Users size={18} className="dash-icon" style={{ color: "var(--color-cyan)" }} /> Subscribers
          </h2>
          <div className="auth-input-wrap">
            <Search size={16} className="auth-input-icon" />
            <input
              className="auth-input"
              type="text"
              placeholder="Search by name..."
              value={subscriberSearch}
              onChange={(e) => setSubscriberSearch(e.target.value)}
            />
          </div>
          {subscribers.length === 0 ? (
            <p>No subscribers yet</p>
          ) : filteredSubscribers.length === 0 ? (
            <p>No subscribers match your search</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Subscriber</th>
                    <th>Address</th>
                    <th>Phone</th>
                    <th>Unit</th>
                    <th>Ampere</th>
                    <th>Status</th>
                    <th>Reading Input</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubscribers.map((subscriber) => (
                    <tr key={subscriber.id}>
                      <td>{subscriber.subscriber_name || subscriber.subscriber_id}</td>
                      <td>{subscriber.address}</td>
                      <td>{subscriber.phone}</td>
                      <td>{subscriber.unit_number}</td>
                      <td>{subscriber.ampere}A</td>
                      <td>
                        <span className={statusPillClass(subscriber.status)}>
                          <span className="pill-dot"></span>
                          {subscriber.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <input
                          className="auth-input owner-reading-input"
                          type="number"
                          placeholder="Reading value"
                          value={readingValues[subscriber.subscriber_id] || ""}
                          onChange={(e) =>
                            handleReadingChange(subscriber.subscriber_id, e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <motion.button
                          className="auth-button owner-submit-button"
                          onClick={() => handleSubmitReading(subscriber.subscriber_id)}
                          whileTap={{ scale: 0.97 }}
                        >
                          Submit Reading
                        </motion.button>
                        {messages[subscriber.subscriber_id] && (
                          <p className="dash-success">
                            {messages[subscriber.subscriber_id]}
                          </p>
                        )}
                        {errors[subscriber.subscriber_id] && (
                          <p className="dash-error">
                            {errors[subscriber.subscriber_id]}
                          </p>
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
          id="chart"
          className="dash-card admin-section"
          {...cardEntrance(1)}
          whileHover={cardHover}
        >
          <h2 className="dash-card-title">
            <BarChart3 size={18} className="dash-icon" style={{ color: "var(--color-cyan)" }} /> Subscriber Consumption Overview
          </h2>
          {subscribers.length === 0 ? (
            <p className="forecast-message">Chart will appear once you have subscribers</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="label" tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} />
                <YAxis hide={true} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-surface-2)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    color: "var(--color-text)",
                  }}
                />
                <Bar dataKey="ampere" fill="var(--color-cyan)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.section>

        <motion.section
          id="issues"
          className="dash-card admin-section"
          {...cardEntrance(2)}
          whileHover={cardHover}
        >
          <h2 className="dash-card-title">
            <AlertCircle size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> Reported Issues
          </h2>
          {issues.length === 0 ? (
            <p>No issues reported yet</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Subscriber</th>
                    <th>Description</th>
                    <th>Reported</th>
                    <th>Status</th>
                    <th>Update</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((issue) => (
                    <tr key={issue.id}>
                      <td>{issue.subscriber_name || "Unknown"}</td>
                      <td>{issue.description}</td>
                      <td>{new Date(issue.created_at).toLocaleString()}</td>
                      <td>
                        <span className={statusPillClass(issue.status)}>
                          <span className="pill-dot"></span>
                          {issue.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <motion.select
                          className="owner-select"
                          value={issue.status}
                          onChange={(e) => handleStatusChange(issue.id, e.target.value)}
                          whileTap={{ scale: 0.97 }}
                        >
                          <option value="open">Open</option>
                          <option value="in progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                        </motion.select>
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
          {...cardEntrance(3)}
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
      </main>
    </div>
  );
}

export default OwnerDashboard;
