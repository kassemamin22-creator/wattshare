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
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: 600 }}>
        <div className="auth-logo">⚡ WattShare</div>
        <div className="auth-title">Owner Dashboard</div>

        {subscribers.length === 0 ? (
          <p>No subscribers yet</p>
        ) : (
          subscribers.map((subscriber) => (
            <div
              key={subscriber.id}
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                padding: "1rem",
                marginBottom: "1rem",
                textAlign: "left",
              }}
            >
              <p>Subscriber ID: {subscriber.subscriber_id}</p>
              <p>Ampere: {subscriber.ampere}A</p>
              <p>Status: {subscriber.status}</p>

              <input
                className="auth-input"
                type="number"
                placeholder="Reading value"
                value={readingValues[subscriber.subscriber_id] || ""}
                onChange={(e) =>
                  handleReadingChange(subscriber.subscriber_id, e.target.value)
                }
              />
              <button
                className="auth-button"
                onClick={() => handleSubmitReading(subscriber.subscriber_id)}
              >
                Submit Reading
              </button>

              {messages[subscriber.subscriber_id] && (
                <p style={{ color: "var(--color-cyan)" }}>
                  {messages[subscriber.subscriber_id]}
                </p>
              )}
              {errors[subscriber.subscriber_id] && (
                <div className="auth-error">
                  {errors[subscriber.subscriber_id]}
                </div>
              )}
            </div>
          ))
        )}

        <h2 className="auth-title">Reported Issues</h2>
        {issues.length === 0 ? (
          <p>No issues reported yet</p>
        ) : (
          issues.map((issue) => (
            <div
              key={issue.id}
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                padding: "1rem",
                marginBottom: "1rem",
                textAlign: "left",
              }}
            >
              <p>{issue.description}</p>
              <p>Reported: {new Date(issue.created_at).toLocaleString()}</p>
              <select
                className="auth-input"
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

        <button className="auth-button" onClick={handleLogout}>
          Log Out
        </button>
      </div>
    </div>
  );
}

export default OwnerDashboard;
