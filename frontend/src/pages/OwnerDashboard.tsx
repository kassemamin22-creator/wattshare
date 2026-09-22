import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, BarChart3, AlertCircle, Gauge, LogOut, Receipt, Search, Loader2, UserCheck, UserPlus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { isAxiosError } from "axios";
import api from "../services/api";
import { useToast } from "../hooks/useToast";

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
  last_reading?: number | null;
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

const NAV_ITEMS = [
  { id: "subscribers", label: "Subscribers", icon: Users },
  { id: "subscribers", label: "Meter Reading", icon: Gauge },
  { id: "issues", label: "Reported Issues", icon: AlertCircle },
  { id: "chart", label: "Consumption Chart", icon: BarChart3 },
  { id: "bills", label: "Bills", icon: Receipt },
  { id: "add-subscriber", label: "Add Subscriber", icon: UserPlus },
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

function OwnerDashboard() {
  const navigate = useNavigate();
  const showToast = useToast();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [activeNavIndex, setActiveNavIndex] = useState(0);
  const [readingValues, setReadingValues] = useState<Record<string, string>>({});
  const [issues, setIssues] = useState<Issue[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [subscriberSearch, setSubscriberSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "all" | "pending" | "inactive">("active");
  const [submittingReadingId, setSubmittingReadingId] = useState<string | null>(null);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [pendingSubscriptions, setPendingSubscriptions] = useState<Subscriber[]>([]);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [subscriberName, setSubscriberName] = useState("");
  const [subscriberEmail, setSubscriberEmail] = useState("");
  const [subscriberPassword, setSubscriberPassword] = useState("");
  const [subscriberAddress, setSubscriberAddress] = useState("");
  const [subscriberPhone, setSubscriberPhone] = useState("");
  const [subscriberUnitNumber, setSubscriberUnitNumber] = useState("");
  const [subscriberAmpere, setSubscriberAmpere] = useState("");
  const [subscriberPaymentMethod, setSubscriberPaymentMethod] = useState("cash");
  const [isAddingSubscriber, setIsAddingSubscriber] = useState(false);

  const fetchSubscribers = () => {
    api.get("/subscribers").then((response) => setSubscribers(response.data));
  };

  useEffect(() => {
    fetchSubscribers();
    api.get("/issues").then((response) => setIssues(response.data));
    api.get("/admin/bills").then((response) => setBills(response.data));
    api.get("/owner/subscriptions/pending").then((response) => setPendingSubscriptions(response.data));
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
    setMarkingPaidId(billId);
    try {
      await api.patch(`/bills/${billId}/mark-paid`);
      setBills((prev) =>
        prev.map((bill) => (bill.id === billId ? { ...bill, status: "paid" } : bill))
      );
    } catch {
      // mark-paid failed; leave the bill status as-is
    } finally {
      setMarkingPaidId(null);
    }
  };

  const handleSubmitReading = async (subscriberId: string, lastReading: number | null | undefined) => {
    const value = readingValues[subscriberId];
    const lastReadingLabel = lastReading != null ? lastReading : "No previous reading";
    if (!window.confirm(`Confirm meter reading: ${value}? Last recorded reading was ${lastReadingLabel}.`)) {
      return;
    }

    setSubmittingReadingId(subscriberId);

    try {
      await api.post("/meter-reading", {
        subscriber_id: subscriberId,
        reading_value: Number(readingValues[subscriberId]),
      });
      showToast("Reading submitted, bill generated", "success");
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        showToast(err.response!.data.detail, "error");
      } else {
        showToast("Failed to submit reading", "error");
      }
    } finally {
      setSubmittingReadingId(null);
    }
  };

  const approveSubscription = async (id: string) => {
    setApprovingId(id);

    try {
      await api.patch(`/owner/subscriptions/${id}/approve`);
      setPendingSubscriptions((prev) => prev.filter((item) => item.id !== id));
      showToast("Subscription approved", "success");
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        showToast(err.response.data.detail, "error");
      } else {
        showToast("Failed to approve subscription", "error");
      }
    } finally {
      setApprovingId(null);
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
      setSubscriberPhone("");
      setSubscriberUnitNumber("");
      setSubscriberAmpere("");
      setSubscriberPaymentMethod("cash");
      fetchSubscribers();
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

  const chartData = subscribers.map((subscriber, index) => ({
    label: `Sub ${index + 1}`,
    ampere: subscriber.ampere,
  }));

  const filteredSubscribers = subscribers.filter((subscriber) => {
    const matchesSearch = (subscriber.subscriber_name || "")
      .toLowerCase()
      .includes(subscriberSearch.toLowerCase());
    const matchesStatus = statusFilter === "all" || subscriber.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <p className="dash-label" style={{ margin: 0 }}>STATUS</p>
            <select
              className="owner-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "active" | "all" | "pending" | "inactive")}
              style={{ flex: "0 1 160px" }}
            >
              <option value="active">Active</option>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
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
                  {filteredSubscribers.map((subscriber, index) => (
                    <motion.tr key={subscriber.id} {...rowEntrance(index)} whileHover={rowHover}>
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
                        <p className="dash-label" style={{ margin: "0 0 4px" }}>
                          Last reading: {subscriber.last_reading != null ? subscriber.last_reading : "No previous reading"}
                        </p>
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
                          onClick={() => handleSubmitReading(subscriber.subscriber_id, subscriber.last_reading)}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          disabled={submittingReadingId === subscriber.subscriber_id}
                        >
                          {submittingReadingId === subscriber.subscriber_id ? (
                            <Loader2 size={14} className="btn-spinner" />
                          ) : (
                            "Submit Reading"
                          )}
                        </motion.button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.section>

        <motion.section
          id="pending-approvals"
          className="dash-card admin-section"
          {...cardEntrance(1)}
          whileHover={cardHover}
        >
          <h2 className="dash-card-title">
            <UserCheck size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> Pending Approvals
          </h2>
          {pendingSubscriptions.length === 0 ? (
            <p>No pending requests</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Subscriber Name</th>
                    <th>Phone</th>
                    <th>Address</th>
                    <th>Ampere</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingSubscriptions.map((item, index) => (
                    <motion.tr key={item.id} {...rowEntrance(index)} whileHover={rowHover}>
                      <td>{item.subscriber_name || item.subscriber_id}</td>
                      <td>{item.phone}</td>
                      <td>{item.address}</td>
                      <td>{item.ampere}A</td>
                      <td>
                        <motion.button
                          className="auth-button owner-submit-button"
                          onClick={() => approveSubscription(item.id)}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          disabled={approvingId === item.id}
                        >
                          {approvingId === item.id ? (
                            <Loader2 size={14} className="btn-spinner" />
                          ) : (
                            "Approve"
                          )}
                        </motion.button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.section>

        <motion.section
          id="chart"
          className="dash-card admin-section"
          {...cardEntrance(2)}
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
          {...cardEntrance(3)}
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
                  {issues.map((issue, index) => (
                    <motion.tr key={issue.id} {...rowEntrance(index)} whileHover={rowHover}>
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
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.section>

        <motion.section
          id="bills"
          className="dash-card admin-section"
          {...cardEntrance(4)}
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
          id="add-subscriber"
          className="dash-card admin-section"
          {...cardEntrance(5)}
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
      </main>
    </div>
  );
}

export default OwnerDashboard;
