import { useEffect, useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
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

interface Prediction {
  prediction: number | null;
  message: string;
}

function Dashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [hasSubscription, setHasSubscription] = useState(true);
  const [bills, setBills] = useState<Bill[]>([]);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [issueDescription, setIssueDescription] = useState("");
  const [issueMessage, setIssueMessage] = useState("");
  const [issueError, setIssueError] = useState("");

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

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
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

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">⚡ WattShare</div>
        <h1 className="auth-title">Welcome to WattShare</h1>
        <p>You are logged in.</p>

        {currentUser && <p>Role: {currentUser.role}</p>}

        <h2 className="auth-title">Subscription</h2>
        {subscription ? (
          <p>
            {subscription.generator_name} — {subscription.ampere}A —{" "}
            {subscription.status}
          </p>
        ) : hasSubscription ? (
          <p>Loading...</p>
        ) : (
          <>
            <p>No subscription yet</p>
            <Link
              className="auth-button"
              to="/subscribe"
              style={{
                display: "block",
                textAlign: "center",
                textDecoration: "none",
                boxSizing: "border-box",
              }}
            >
              Subscribe Now
            </Link>
          </>
        )}

        <h2 className="auth-title">Bills</h2>
        {bills.length === 0 ? (
          <p>No bills yet</p>
        ) : (
          <ul>
            {bills.map((bill) => (
              <li key={bill.id}>
                {bill.consumption_kwh} kWh — ${bill.amount.toFixed(2)} —{" "}
                {bill.status}
              </li>
            ))}
          </ul>
        )}

        <h2 className="auth-title">Predicted Next Bill</h2>
        {prediction && (
          <>
            {prediction.prediction !== null ? (
              <>
                <p>${prediction.prediction.toFixed(2)}</p>
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
                  {prediction.message}
                </p>
              </>
            ) : (
              <p>{prediction.message}</p>
            )}
          </>
        )}

        <h2 className="auth-title">Report an Issue</h2>
        <form onSubmit={handleReportIssue}>
          <textarea
            className="auth-input"
            placeholder="Describe the issue"
            value={issueDescription}
            onChange={(e) => setIssueDescription(e.target.value)}
            rows={3}
          />
          <button className="auth-button" type="submit">
            Report Issue
          </button>
          {issueMessage && (
            <p style={{ color: "var(--color-cyan)" }}>{issueMessage}</p>
          )}
          {issueError && <div className="auth-error">{issueError}</div>}
        </form>

        <button className="auth-button" onClick={handleLogout}>
          Log Out
        </button>
      </div>
    </div>
  );
}

export default Dashboard;
