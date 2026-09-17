import { useEffect, useState, FormEvent, CSSProperties } from "react";
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

function ZapIcon() {
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
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg
      className="dash-icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-cyan)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="20" x2="18" y2="10"></line>
      <line x1="12" y1="20" x2="12" y2="4"></line>
      <line x1="6" y1="20" x2="6" y2="14"></line>
    </svg>
  );
}

function ReceiptIcon() {
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
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
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

function ChatIcon() {
  return (
    <svg
      className="dash-icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-cyan)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
    </svg>
  );
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

  return (
    <div className="dash-page">
      <div className="dash-content">
        <div className="dash-header">
          <div className="dash-logo">⚡ WattShare</div>
          <div className="dash-avatar">{avatarInitial}</div>
        </div>

        <div className="dash-greeting">
          <p className="dash-greeting-text">Hello, {displayName}</p>
          {subscription && (
            <span className="pill pill-success pill-live">
              {subscription.ampere}A ACTIVE
            </span>
          )}
        </div>

        <div className="dash-card">
          <h2 className="dash-card-title">
            <ZapIcon /> My Subscription
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
        </div>

        <div className="stat-row">
          <div className="stat-card stat-card-cyan">
            <p className="dash-label">
              <BarChartIcon /> TOTAL CONSUMPTION
            </p>
            <p className="stat-number-cyan">{totalConsumption} kWh</p>
          </div>
          <div className="stat-card stat-card-amber">
            <p className="dash-label">CURRENT BALANCE</p>
            <p className="stat-number-amber">{currentBalance.toFixed(2)} USD</p>
          </div>
        </div>

        <div className="dash-card forecast-card">
          <p className="forecast-label">✨ AI FORECAST</p>
          {prediction && prediction.prediction !== null ? (
            <>
              <p className="forecast-amount">${prediction.prediction.toFixed(2)}</p>
              <p className="forecast-message">{prediction.message}</p>
              <div className="forecast-bar-track">
                <div className="forecast-bar-fill" style={forecastBarStyle}></div>
              </div>
            </>
          ) : (
            <p className="forecast-message">{prediction?.message ?? "Loading..."}</p>
          )}
        </div>

        <div className="dash-card">
          <h2 className="dash-card-title">
            <ReceiptIcon /> Billing History
          </h2>
          {bills.length === 0 ? (
            <p>No bills yet</p>
          ) : (
            <div>
              {bills.map((bill) => (
                <div className="bill-row" key={bill.id}>
                  <div>
                    <p className="bill-kwh">{bill.consumption_kwh} kWh</p>
                    <p className="bill-date">
                      {new Date(bill.created_at).toLocaleDateString()}
                    </p>
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
        </div>

        <div className="dash-card">
          <h2 className="dash-card-title">
            <ChatIcon /> Report an Issue
          </h2>
          <form onSubmit={handleReportIssue}>
            <textarea
              className="dash-textarea"
              placeholder="Describe the issue..."
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              rows={3}
            />
            <button className="dash-button" type="submit">
              Submit Report
            </button>
            {issueMessage && <p className="dash-success">{issueMessage}</p>}
            {issueError && <p className="dash-error">{issueError}</p>}
          </form>
        </div>

        <button className="dash-button-logout" onClick={handleLogout}>
          <LogoutIcon /> Log Out
        </button>
      </div>
    </div>
  );
}

export default Dashboard;
