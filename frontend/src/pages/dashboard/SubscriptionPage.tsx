import { useState, type FormEvent } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Loader2 } from "lucide-react";
import { isAxiosError } from "axios";
import api from "../../services/api";
import { useToast } from "../../hooks/useToast";
import type { DashboardContext } from "./DashboardLayout";
import { statusPillClass, cardEntrance, cardHover } from "./shared";

function SubscriptionPage() {
  const showToast = useToast();
  const { subscription, setSubscription, hasSubscription, fetchSubscription } =
    useOutletContext<DashboardContext>();

  const [isEditing, setIsEditing] = useState(false);
  const [editAddress, setEditAddress] = useState("");
  const [editBuilding, setEditBuilding] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [requestedAmpere, setRequestedAmpere] = useState("");
  const [isRequestingAmpereChange, setIsRequestingAmpereChange] = useState(false);

  const handleStartEditing = () => {
    if (!subscription) return;
    setEditAddress(subscription.address);
    setEditBuilding(subscription.building);
    setEditPhone(subscription.phone);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
  };

  const handleSaveEditing = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSavingEdit(true);

    try {
      const response = await api.patch("/subscription/me", {
        address: editAddress,
        building: editBuilding,
        phone: editPhone,
      });
      setSubscription(response.data);
      setIsEditing(false);
      showToast("Subscription details updated successfully", "success");
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        showToast(err.response.data.detail, "error");
      } else {
        showToast("Failed to update subscription details", "error");
      }
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleRequestAmpereChange = async () => {
    setIsRequestingAmpereChange(true);

    try {
      await api.post("/subscription/me/request-ampere-change", {
        ampere: Number(requestedAmpere),
      });
      showToast("Ampere change requested", "success");
      setRequestedAmpere("");
      fetchSubscription();
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        showToast(err.response.data.detail, "error");
      } else {
        showToast("Failed to request ampere change", "error");
      }
    } finally {
      setIsRequestingAmpereChange(false);
    }
  };

  return (
    <motion.div
      id="subscription"
      className="dash-card admin-section"
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
          {subscription.pending_ampere_change != null ? (
            <span className="pill pill-warning">
              Ampere change requested: {subscription.pending_ampere_change}A (awaiting manager approval)
            </span>
          ) : (
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <input
                className="auth-input"
                type="number"
                placeholder="New ampere value"
                value={requestedAmpere}
                onChange={(e) => setRequestedAmpere(e.target.value)}
                style={{ marginBottom: 0, flex: 1 }}
              />
              <motion.button
                className="dash-button-outline"
                type="button"
                onClick={handleRequestAmpereChange}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                disabled={isRequestingAmpereChange}
                style={{ marginTop: 0, width: "auto", padding: "0.6rem 1rem" }}
              >
                {isRequestingAmpereChange ? <Loader2 size={16} className="btn-spinner" /> : "Request Change"}
              </motion.button>
            </div>
          )}
          <hr className="dash-divider" />
          {!isEditing && (
            <>
              <div className="dash-cols">
                <div className="dash-col">
                  <p className="dash-label">ADDRESS</p>
                  <p className="dash-value-lg">{subscription.address}</p>
                </div>
                <div className="dash-col">
                  <p className="dash-label">BUILDING</p>
                  <p className="dash-value-lg">{subscription.building}</p>
                </div>
                <div className="dash-col">
                  <p className="dash-label">PHONE</p>
                  <p className="dash-value-lg">{subscription.phone}</p>
                </div>
              </div>
              <motion.button
                className="dash-button-outline"
                onClick={handleStartEditing}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Edit Details
              </motion.button>
            </>
          )}
          <AnimatePresence initial={false}>
            {isEditing && (
              <motion.div
                key="edit-subscription-form"
                initial={{ height: 0, opacity: 0, y: -8 }}
                animate={{ height: "auto", opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                style={{ overflow: "hidden" }}
              >
                <form onSubmit={handleSaveEditing}>
                  <input
                    className="auth-input"
                    type="text"
                    placeholder="Address"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                  />
                  <input
                    className="auth-input"
                    type="text"
                    placeholder="Building name or number"
                    value={editBuilding}
                    onChange={(e) => setEditBuilding(e.target.value)}
                  />
                  <input
                    className="auth-input"
                    type="tel"
                    placeholder="Phone"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    <motion.button
                      className="dash-button"
                      type="submit"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      disabled={isSavingEdit}
                      style={{ flex: 1 }}
                    >
                      {isSavingEdit ? <Loader2 size={16} className="btn-spinner" /> : "Save"}
                    </motion.button>
                    <motion.button
                      className="dash-button-outline"
                      type="button"
                      onClick={handleCancelEditing}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      style={{ flex: 1, marginTop: 0 }}
                    >
                      Cancel
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
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
  );
}

export default SubscriptionPage;
