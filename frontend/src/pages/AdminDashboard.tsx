import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

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

function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);

  useEffect(() => {
    api.get("/admin/users").then((response) => setUsers(response.data));
    api
      .get("/admin/subscriptions")
      .then((response) => setSubscriptions(response.data));
    api.get("/admin/bills").then((response) => setBills(response.data));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: 600 }}>
        <div className="auth-logo">⚡ WattShare</div>
        <div className="auth-title">Admin Dashboard</div>

        <h2 className="auth-title">Users</h2>
        {users.length === 0 ? (
          <p>No data yet</p>
        ) : (
          <ul>
            {users.map((user) => (
              <li key={user.id}>
                {user.name} — {user.email} — {user.role}
              </li>
            ))}
          </ul>
        )}

        <h2 className="auth-title">Subscriptions</h2>
        {subscriptions.length === 0 ? (
          <p>No data yet</p>
        ) : (
          <ul>
            {subscriptions.map((subscription) => (
              <li key={subscription.id}>
                {subscription.subscriber_id} — {subscription.ampere}A —{" "}
                {subscription.status}
              </li>
            ))}
          </ul>
        )}

        <h2 className="auth-title">Bills</h2>
        {bills.length === 0 ? (
          <p>No data yet</p>
        ) : (
          <ul>
            {bills.map((bill) => (
              <li key={bill.id}>
                {bill.subscriber_id} — {bill.consumption_kwh} kWh — $
                {bill.amount.toFixed(2)} — {bill.status}
              </li>
            ))}
          </ul>
        )}

        <button className="dash-button-logout" onClick={handleLogout}>
          <LogoutIcon /> Log Out
        </button>
      </div>
    </div>
  );
}

export default AdminDashboard;
