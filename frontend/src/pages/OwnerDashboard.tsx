import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import api from "../services/api";

interface Subscriber {
  id: string;
  subscriber_id: string;
  generator_name: string;
  ampere: number;
  tariff_rate: number;
  status: string;
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

function AlertIcon() {
  return (
    <svg
      className="dash-icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-accent)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
  );
}

function GaugeIcon() {
  return (
    <svg
      className="dash-icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-accent)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 14 4-4"></path>
      <path d="M3.34 19a10 10 0 1 1 17.32 0"></path>
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      className="dash-icon"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-cyan)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
      <polyline points="16 17 21 12 16 7"></polyline>
      <line x1="21" y1="12" x2="9" y2="12"></line>
    </svg>
  );
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

  return (
    <div className="dash-page">
      <div className="dash-content">
        <div className="dash-logo">⚡ WattShare</div>
        <div className="dash-page-title">
          <GaugeIcon /> Owner Dashboard
        </div>

        {subscribers.length === 0 ? (
          <p>No subscribers yet</p>
        ) : (
          subscribers.map((subscriber) => (
            <div key={subscriber.id} className="owner-row">
              <p className="owner-row-id">
                <UserIcon /> Subscriber ID: {subscriber.subscriber_id}
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
              <button
                className="auth-button owner-submit-button"
                onClick={() => handleSubmitReading(subscriber.subscriber_id)}
              >
                Submit Reading
              </button>

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
            </div>
          ))
        )}

        <h2 className="dash-card-title">
          <AlertIcon /> Reported Issues
        </h2>
        {issues.length === 0 ? (
          <p>No issues reported yet</p>
        ) : (
          issues.map((issue) => (
            <div key={issue.id} className="owner-row">
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
              <select
                className="owner-select"
                value={issue.status}
                onChange={(e) => handleStatusChange(issue.id, e.target.value)}
              >
                <option value="open">Open</option>
                <option value="in progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          ))
        )}

        <button className="dash-button-logout" onClick={handleLogout}>
          <LogoutIcon /> Log Out
        </button>
      </div>
    </div>
  );
}

export default OwnerDashboard;
