import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

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

        <button className="auth-button" onClick={handleLogout}>
          Log Out
        </button>
      </div>
    </div>
  );
}

export default AdminDashboard;
