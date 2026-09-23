import { useState, type FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { UserPlus, Loader2 } from "lucide-react";
import { isAxiosError } from "axios";
import api from "../../services/api";
import { useToast } from "../../hooks/useToast";
import type { AdminDashboardContext } from "./AdminDashboardLayout";
import { cardEntrance, cardHover, SUBSCRIBER_PAYMENT_METHODS } from "./shared";

function AddSubscriberPage() {
  const showToast = useToast();
  const { fetchUsers, fetchSubscriptions } = useOutletContext<AdminDashboardContext>();

  const [subscriberName, setSubscriberName] = useState("");
  const [subscriberEmail, setSubscriberEmail] = useState("");
  const [subscriberPassword, setSubscriberPassword] = useState("");
  const [subscriberAddress, setSubscriberAddress] = useState("");
  const [subscriberBuilding, setSubscriberBuilding] = useState("");
  const [subscriberPhone, setSubscriberPhone] = useState("");
  const [subscriberAmpere, setSubscriberAmpere] = useState("");
  const [subscriberPaymentMethod, setSubscriberPaymentMethod] = useState("cash");
  const [isAddingSubscriber, setIsAddingSubscriber] = useState(false);

  const handleAddSubscriber = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsAddingSubscriber(true);

    try {
      await api.post("/admin/add-subscriber", {
        name: subscriberName,
        email: subscriberEmail,
        password: subscriberPassword,
        address: subscriberAddress,
        building: subscriberBuilding,
        phone: subscriberPhone,
        ampere: Number(subscriberAmpere),
        payment_method: subscriberPaymentMethod,
      });
      showToast("Subscriber account created successfully", "success");
      setSubscriberName("");
      setSubscriberEmail("");
      setSubscriberPassword("");
      setSubscriberAddress("");
      setSubscriberBuilding("");
      setSubscriberPhone("");
      setSubscriberAmpere("");
      setSubscriberPaymentMethod("cash");
      fetchUsers();
      fetchSubscriptions();
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

  return (
    <motion.section
      id="add-subscriber"
      className="dash-card admin-section admin-form-card"
      {...cardEntrance(0)}
      whileHover={cardHover}
    >
      <h2 className="dash-card-title admin-form-title">
        <UserPlus size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> Add Subscriber
      </h2>
      <form onSubmit={handleAddSubscriber} className="admin-form-grid">
        <div className="admin-form-field">
          <label className="auth-label" htmlFor="admin-add-subscriber-name">Name</label>
          <input
            id="admin-add-subscriber-name"
            className="auth-input"
            type="text"
            placeholder="Name"
            value={subscriberName}
            onChange={(e) => setSubscriberName(e.target.value)}
          />
        </div>
        <div className="admin-form-field">
          <label className="auth-label" htmlFor="admin-add-subscriber-email">Email</label>
          <input
            id="admin-add-subscriber-email"
            className="auth-input"
            type="email"
            placeholder="Email"
            value={subscriberEmail}
            onChange={(e) => setSubscriberEmail(e.target.value)}
          />
        </div>
        <div className="admin-form-field">
          <label className="auth-label" htmlFor="admin-add-subscriber-password">Password</label>
          <input
            id="admin-add-subscriber-password"
            className="auth-input"
            type="password"
            placeholder="Password"
            value={subscriberPassword}
            onChange={(e) => setSubscriberPassword(e.target.value)}
          />
        </div>
        <div className="admin-form-field">
          <label className="auth-label" htmlFor="admin-add-subscriber-ampere">Ampere</label>
          <input
            id="admin-add-subscriber-ampere"
            className="auth-input"
            type="number"
            placeholder="Ampere"
            value={subscriberAmpere}
            onChange={(e) => setSubscriberAmpere(e.target.value)}
          />
        </div>
        <div className="admin-form-field">
          <label className="auth-label" htmlFor="admin-add-subscriber-address">Address</label>
          <input
            id="admin-add-subscriber-address"
            className="auth-input"
            type="text"
            placeholder="Address"
            value={subscriberAddress}
            onChange={(e) => setSubscriberAddress(e.target.value)}
          />
        </div>
        <div className="admin-form-field">
          <label className="auth-label" htmlFor="admin-add-subscriber-building">Building name or number</label>
          <input
            id="admin-add-subscriber-building"
            className="auth-input"
            type="text"
            placeholder="Building name or number"
            value={subscriberBuilding}
            onChange={(e) => setSubscriberBuilding(e.target.value)}
          />
        </div>
        <div className="admin-form-field admin-form-full">
          <label className="auth-label" htmlFor="admin-add-subscriber-phone">Phone</label>
          <input
            id="admin-add-subscriber-phone"
            className="auth-input"
            type="tel"
            placeholder="Phone"
            value={subscriberPhone}
            onChange={(e) => setSubscriberPhone(e.target.value)}
          />
        </div>
        <div className="admin-form-full">
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
        </div>
        <motion.button
          className="auth-button admin-form-full"
          type="submit"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          disabled={isAddingSubscriber}
        >
          {isAddingSubscriber ? <Loader2 size={16} className="btn-spinner" /> : "Add Subscriber"}
        </motion.button>
      </form>
    </motion.section>
  );
}

export default AddSubscriberPage;
