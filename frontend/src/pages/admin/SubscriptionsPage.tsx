import { useState, type FormEvent, Fragment } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Pencil, ChevronDown, Loader2 } from "lucide-react";
import { isAxiosError } from "axios";
import api from "../../services/api";
import { useToast } from "../../hooks/useToast";
import type { AdminDashboardContext, Subscription } from "./AdminDashboardLayout";
import { statusPillClass, cardEntrance, cardHover, rowEntrance, rowHover } from "./shared";

function SubscriptionsPage() {
  const showToast = useToast();
  const { subscriptions, setSubscriptions, fetchSubscriptions } = useOutletContext<AdminDashboardContext>();

  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState<"active" | "all" | "pending" | "inactive">("active");
  const [togglingSubscriptionId, setTogglingSubscriptionId] = useState<string | null>(null);
  const [expandedSubscriptionId, setExpandedSubscriptionId] = useState<string | null>(null);
  const [editingSubscriptionId, setEditingSubscriptionId] = useState<string | null>(null);
  const [editSubscriptionAddress, setEditSubscriptionAddress] = useState("");
  const [editSubscriptionBuilding, setEditSubscriptionBuilding] = useState("");
  const [editSubscriptionPhone, setEditSubscriptionPhone] = useState("");
  const [editSubscriptionUnitNumber, setEditSubscriptionUnitNumber] = useState("");
  const [editSubscriptionAmpere, setEditSubscriptionAmpere] = useState("");
  const [isSavingSubscription, setIsSavingSubscription] = useState(false);

  const toggleExpanded = (subscriptionId: string) => {
    setExpandedSubscriptionId((prev) => (prev === subscriptionId ? null : subscriptionId));
  };

  const handleToggleSubscriptionStatus = async (subscriptionId: string) => {
    setTogglingSubscriptionId(subscriptionId);
    try {
      const response = await api.patch(`/admin/subscriptions/${subscriptionId}/toggle-status`);
      setSubscriptions((prev) =>
        prev.map((subscription) =>
          subscription.id === subscriptionId
            ? { ...subscription, status: response.data.status }
            : subscription
        )
      );
    } catch {
      // toggle-status failed; leave the subscription status as-is
    } finally {
      setTogglingSubscriptionId(null);
    }
  };

  const handleStartEditSubscription = (subscription: Subscription) => {
    setEditingSubscriptionId(subscription.id);
    setEditSubscriptionAddress(subscription.address);
    setEditSubscriptionBuilding(subscription.building);
    setEditSubscriptionPhone(subscription.phone);
    setEditSubscriptionUnitNumber(subscription.unit_number);
    setEditSubscriptionAmpere(String(subscription.ampere));
  };

  const handleCancelEditSubscription = () => {
    setEditingSubscriptionId(null);
  };

  const handleSaveEditSubscription = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingSubscriptionId) return;

    setIsSavingSubscription(true);

    try {
      await api.patch(`/admin/subscriptions/${editingSubscriptionId}`, {
        address: editSubscriptionAddress,
        building: editSubscriptionBuilding,
        phone: editSubscriptionPhone,
        unit_number: editSubscriptionUnitNumber,
        ampere: Number(editSubscriptionAmpere),
      });
      showToast("Subscription updated successfully", "success");
      setEditingSubscriptionId(null);
      fetchSubscriptions();
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        showToast(err.response.data.detail, "error");
      } else {
        showToast("Failed to update subscription", "error");
      }
    } finally {
      setIsSavingSubscription(false);
    }
  };

  const filteredSubscriptions = subscriptions.filter(
    (subscription) => subscriptionStatusFilter === "all" || subscription.status === subscriptionStatusFilter
  );

  return (
    <motion.section
      id="subscriptions"
      className="dash-card admin-section"
      {...cardEntrance(0)}
      whileHover={cardHover}
    >
      <h2 className="dash-card-title">
        <Zap size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> Subscriptions
      </h2>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
        <p className="dash-label" style={{ margin: 0 }}>STATUS</p>
        <select
          className="owner-select"
          value={subscriptionStatusFilter}
          onChange={(e) =>
            setSubscriptionStatusFilter(e.target.value as "active" | "all" | "pending" | "inactive")
          }
          style={{ flex: "0 1 160px" }}
        >
          <option value="active">Active</option>
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      {subscriptions.length === 0 ? (
        <p>No data yet</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Subscriber</th>
                <th>Status</th>
                <th>Ampere</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubscriptions.map((subscription, index) => {
                const isEditingThis = editingSubscriptionId === subscription.id;
                const isExpanded = expandedSubscriptionId === subscription.id;
                const showDetails = isEditingThis || isExpanded;

                return (
                  <Fragment key={subscription.id}>
                    <motion.tr {...rowEntrance(index)} whileHover={rowHover}>
                      <td>{subscription.subscriber_name || subscription.subscriber_id}</td>
                      <td>
                        <span className={statusPillClass(subscription.status)}>
                          <span className="pill-dot"></span>
                          {subscription.status.toUpperCase()}
                        </span>
                      </td>
                      <td>{subscription.ampere}A</td>
                      <td>
                        <motion.button
                          className="dash-button-outline"
                          onClick={() => toggleExpanded(subscription.id)}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          style={{ marginTop: 0, width: "auto", padding: "0.5rem 0.75rem" }}
                          aria-label={isExpanded ? "Collapse details" : "Expand details"}
                        >
                          <motion.span
                            style={{ display: "inline-flex" }}
                            animate={{ rotate: showDetails ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown size={14} />
                          </motion.span>
                        </motion.button>
                      </td>
                    </motion.tr>
                    <AnimatePresence initial={false}>
                      {showDetails && (
                        <motion.tr
                          key="details-row"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <td colSpan={4}>
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25, ease: "easeInOut" }}
                              style={{ overflow: "hidden" }}
                            >
                              {isEditingThis ? (
                                <form
                                  onSubmit={handleSaveEditSubscription}
                                  style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}
                                >
                                  <input
                                    className="auth-input"
                                    type="text"
                                    placeholder="Address"
                                    value={editSubscriptionAddress}
                                    onChange={(e) => setEditSubscriptionAddress(e.target.value)}
                                    style={{ flex: "1 1 160px", marginBottom: 0 }}
                                  />
                                  <input
                                    className="auth-input"
                                    type="text"
                                    placeholder="Building name or number"
                                    value={editSubscriptionBuilding}
                                    onChange={(e) => setEditSubscriptionBuilding(e.target.value)}
                                    style={{ flex: "1 1 160px", marginBottom: 0 }}
                                  />
                                  <input
                                    className="auth-input"
                                    type="tel"
                                    placeholder="Phone"
                                    value={editSubscriptionPhone}
                                    onChange={(e) => setEditSubscriptionPhone(e.target.value)}
                                    style={{ flex: "1 1 160px", marginBottom: 0 }}
                                  />
                                  <input
                                    className="auth-input"
                                    type="text"
                                    placeholder="Apt/Unit number"
                                    value={editSubscriptionUnitNumber}
                                    onChange={(e) => setEditSubscriptionUnitNumber(e.target.value)}
                                    style={{ flex: "1 1 160px", marginBottom: 0 }}
                                  />
                                  <input
                                    className="auth-input"
                                    type="number"
                                    placeholder="Ampere"
                                    value={editSubscriptionAmpere}
                                    onChange={(e) => setEditSubscriptionAmpere(e.target.value)}
                                    style={{ flex: "1 1 160px", marginBottom: 0 }}
                                  />
                                  <motion.button
                                    className="auth-button owner-submit-button"
                                    type="submit"
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    disabled={isSavingSubscription}
                                    style={{ marginTop: 0, width: "auto", padding: "0.6rem 1rem" }}
                                  >
                                    {isSavingSubscription ? <Loader2 size={14} className="btn-spinner" /> : "Save"}
                                  </motion.button>
                                  <motion.button
                                    className="dash-button-outline"
                                    type="button"
                                    onClick={handleCancelEditSubscription}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    style={{ marginTop: 0, width: "auto", padding: "0.6rem 1rem" }}
                                  >
                                    Cancel
                                  </motion.button>
                                </form>
                              ) : (
                                <>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", marginBottom: "1rem" }}>
                                    <div style={{ minWidth: "120px" }}>
                                      <p className="dash-label">ADDRESS</p>
                                      <p className="dash-value-lg">{subscription.address || "—"}</p>
                                    </div>
                                    <div style={{ minWidth: "120px" }}>
                                      <p className="dash-label">BUILDING</p>
                                      <p className="dash-value-lg">{subscription.building || "—"}</p>
                                    </div>
                                    <div style={{ minWidth: "120px" }}>
                                      <p className="dash-label">PHONE</p>
                                      <p className="dash-value-lg">{subscription.phone || "—"}</p>
                                    </div>
                                    <div style={{ minWidth: "120px" }}>
                                      <p className="dash-label">UNIT</p>
                                      <p className="dash-value-lg">{subscription.unit_number || "—"}</p>
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", gap: "0.5rem" }}>
                                    <motion.button
                                      className="dash-button-outline"
                                      onClick={() => handleStartEditSubscription(subscription)}
                                      whileHover={{ scale: 1.03 }}
                                      whileTap={{ scale: 0.97 }}
                                      style={{ marginTop: 0, width: "auto", padding: "0.5rem 0.75rem" }}
                                    >
                                      <Pencil size={14} /> Edit
                                    </motion.button>
                                    {subscription.status === "active" ? (
                                      <motion.button
                                        className="admin-mobile-logout"
                                        onClick={() => handleToggleSubscriptionStatus(subscription.id)}
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        disabled={togglingSubscriptionId === subscription.id}
                                      >
                                        {togglingSubscriptionId === subscription.id ? (
                                          <Loader2 size={14} className="btn-spinner" />
                                        ) : (
                                          "Deactivate"
                                        )}
                                      </motion.button>
                                    ) : (
                                      <motion.button
                                        className="auth-button owner-submit-button"
                                        onClick={() => handleToggleSubscriptionStatus(subscription.id)}
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        disabled={togglingSubscriptionId === subscription.id}
                                      >
                                        {togglingSubscriptionId === subscription.id ? (
                                          <Loader2 size={14} className="btn-spinner" />
                                        ) : (
                                          "Activate"
                                        )}
                                      </motion.button>
                                    )}
                                  </div>
                                </>
                              )}
                            </motion.div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </motion.section>
  );
}

export default SubscriptionsPage;
