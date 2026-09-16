import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

function Dashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [hasSubscription, setHasSubscription] = useState(true);
  const [bills, setBills] = useState<Bill[]>([]);

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
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
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
          <p>No subscription yet</p>
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

        <button className="auth-button" onClick={handleLogout}>
          Log Out
        </button>
      </div>
    </div>
  );
}

export default Dashboard;
