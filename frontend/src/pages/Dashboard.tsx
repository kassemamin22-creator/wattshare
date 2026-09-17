import { useEffect, useState, FormEvent, CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, animate } from "framer-motion";
import { Zap, BarChart3, Receipt, MessageCircle, LogOut, Sparkles } from "lucide-react";
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
  const [displayedForecast, setDisplayedForecast] = useState(0);

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

  const chartData = [...bills].reverse().map((bill) => ({
    date: new Date(bill.created_at).toLocaleDateString(),
    consumption_kwh: bill.consumption_kwh,
  }));

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

        <motion.div
          className="dash-card"
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

        <div className="stat-row">
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
          className="dash-card"
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
            <ResponsiveContainer width="100%" height={180}>
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
          className="dash-card forecast-card"
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
          className="dash-card"
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
        </motion.div>

        <motion.div
          className="dash-card"
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

export default Dashboard;
