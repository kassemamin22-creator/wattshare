import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BarChart3, AlertCircle, Gauge, User, LogOut } from "lucide-react";
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
  subscriber_name?: string;
}

interface Issue {
  id: string;
  subscriber_id: string;
  description: string;
  status: string;
  created_at: string;
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

function OwnerDashboard() {
  const navigate = useNavigate();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [readingValues, setReadingValues] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [issues, setIssues] = useState<Issue[]>([]);

  useEffect(() => {
    api.get("/subscribers").then((response) => setSubscribers(response.data));
    api.get("/issues").then((response) => setIssues(response.data));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
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

  return (
    <div className="dash-page">
      <div className="dash-content">
        <div className="dash-logo">⚡ WattShare</div>
        <div className="dash-page-title">
          <Gauge size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> Manager Dashboard
        </div>

        {subscribers.length === 0 ? (
          <p>No subscribers yet</p>
        ) : (
          subscribers.map((subscriber, index) => (
            <motion.div
              key={subscriber.id}
              className="owner-row"
              style={{ animation: "none" }}
              {...cardEntrance(index)}
              whileHover={cardHover}
            >
              <p className="owner-row-id">
                <User size={18} className="dash-icon" style={{ color: "var(--color-cyan)" }} /> Subscriber: {subscriber.subscriber_name || subscriber.subscriber_id}
              </p>
              <p className="owner-row-value">Ampere: {subscriber.ampere}A</p>
              <p className="owner-row-status-line">
                Status:
                <span className={statusPillClass(subscriber.status)}>
                  <span className="pill-dot"></span>
                  {subscriber.status.toUpperCase()}
                </span>
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
            </motion.div>
          ))
        )}

        <motion.div
          className="dash-card"
          style={{ animation: "none" }}
          {...cardEntrance(subscribers.length)}
          whileHover={cardHover}
        >
          <h2 className="dash-card-title">
            <BarChart3 size={18} className="dash-icon" style={{ color: "var(--color-cyan)" }} /> Subscriber Consumption Overview
          </h2>
          {subscribers.length === 0 ? (
            <p className="forecast-message">Chart will appear once you have subscribers</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
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
        </motion.div>

        <h2 className="dash-card-title">
          <AlertCircle size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> Reported Issues
        </h2>
        {issues.length === 0 ? (
          <p>No issues reported yet</p>
        ) : (
          issues.map((issue, index) => (
            <motion.div
              key={issue.id}
              className="owner-row"
              style={{ animation: "none" }}
              {...cardEntrance(index)}
              whileHover={cardHover}
            >
              <p className="owner-issue-desc">{issue.description}</p>
              <p className="owner-issue-date">
                Reported: {new Date(issue.created_at).toLocaleString()}
              </p>
              <div className="owner-issue-status-row">
                <span className={statusPillClass(issue.status)}>
                  <span className="pill-dot"></span>
                  {issue.status.toUpperCase()}
                </span>
              </div>
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
            </motion.div>
          ))
        )}

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

export default OwnerDashboard;
