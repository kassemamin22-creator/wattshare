import { useState, type FormEvent, Fragment } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Pencil, ChevronDown, Loader2 } from "lucide-react";
import { isAxiosError } from "axios";
import api from "../../services/api";
import { useToast } from "../../hooks/useToast";
import { useTranslation } from "react-i18next";
import { getApiErrorMessage } from "../../utils/apiError";
import type { AdminDashboardContext, Subscription } from "./AdminDashboardLayout";
import { statusPillClass, translateStatus, cardEntrance, cardHover, rowEntrance, rowHover } from "./shared";

function SubscriptionsPage() {
  const showToast = useToast();
  const { t } = useTranslation();
  const { subscriptions, setSubscriptions, fetchSubscriptions } = useOutletContext<AdminDashboardContext>();

  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState<"active" | "all" | "pending" | "inactive">("active");
  const [togglingSubscriptionId, setTogglingSubscriptionId] = useState<string | null>(null);
  const [expandedSubscriptionId, setExpandedSubscriptionId] = useState<string | null>(null);
  const [editingSubscriptionId, setEditingSubscriptionId] = useState<string | null>(null);
  const [editSubscriptionAddress, setEditSubscriptionAddress] = useState("");
  const [editSubscriptionBuilding, setEditSubscriptionBuilding] = useState("");
  const [editSubscriptionPhone, setEditSubscriptionPhone] = useState("");
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
    } catch (err) {
      showToast(getApiErrorMessage(err, t("admin.subscriptions.toastToggleFailed")), "error");
    } finally {
      setTogglingSubscriptionId(null);
    }
  };

  const handleStartEditSubscription = (subscription: Subscription) => {
    setEditingSubscriptionId(subscription.id);
    setEditSubscriptionAddress(subscription.address);
    setEditSubscriptionBuilding(subscription.building);
    setEditSubscriptionPhone(subscription.phone);
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
        ampere: Number(editSubscriptionAmpere),
      });
      showToast(t("admin.subscriptions.toastUpdateSuccess"), "success");
      setEditingSubscriptionId(null);
      fetchSubscriptions();
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        showToast(err.response.data.detail, "error");
      } else {
        showToast(t("admin.subscriptions.toastUpdateFailed"), "error");
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
        <Zap size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> {t("admin.subscriptions.title")}
      </h2>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
        <p className="dash-label" style={{ margin: 0 }}>{t("owner.subscribers.statusFilter")}</p>
        <select
          className="owner-select"
          value={subscriptionStatusFilter}
          onChange={(e) =>
            setSubscriptionStatusFilter(e.target.value as "active" | "all" | "pending" | "inactive")
          }
          style={{ flex: "0 1 160px" }}
        >
          <option value="active">{t("common.status.active")}</option>
          <option value="all">{t("owner.subscribers.statusAll")}</option>
          <option value="pending">{t("common.status.pending")}</option>
          <option value="inactive">{t("common.status.inactive")}</option>
        </select>
      </div>
      {subscriptions.length === 0 ? (
        <p>{t("owner.bills.emptyState")}</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("owner.subscribers.colSubscriber")}</th>
                <th>{t("owner.subscribers.colStatus")}</th>
                <th>{t("owner.subscribers.colAmpere")}</th>
                <th>{t("owner.subscribers.colAction")}</th>
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
                          {translateStatus(t, subscription.status)}
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
                          aria-label={isExpanded ? t("owner.subscribers.collapseDetails") : t("owner.subscribers.expandDetails")}
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
                                  style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}
                                >
                                  <div style={{ flex: "1 1 160px" }}>
                                    <label className="auth-label" htmlFor={`admin-edit-address-${subscription.id}`}>{t("dashboard.subscription.addressLabel")}</label>
                                    <input
                                      id={`admin-edit-address-${subscription.id}`}
                                      className="auth-input"
                                      type="text"
                                      placeholder={t("dashboard.subscription.addressLabel")}
                                      value={editSubscriptionAddress}
                                      onChange={(e) => setEditSubscriptionAddress(e.target.value)}
                                      style={{ marginBottom: 0 }}
                                    />
                                  </div>
                                  <div style={{ flex: "1 1 160px" }}>
                                    <label className="auth-label" htmlFor={`admin-edit-building-${subscription.id}`}>{t("dashboard.subscription.buildingLabel")}</label>
                                    <input
                                      id={`admin-edit-building-${subscription.id}`}
                                      className="auth-input"
                                      type="text"
                                      placeholder={t("dashboard.subscription.buildingLabel")}
                                      value={editSubscriptionBuilding}
                                      onChange={(e) => setEditSubscriptionBuilding(e.target.value)}
                                      style={{ marginBottom: 0 }}
                                    />
                                  </div>
                                  <div style={{ flex: "1 1 160px" }}>
                                    <label className="auth-label" htmlFor={`admin-edit-phone-${subscription.id}`}>{t("dashboard.subscription.phoneLabel")}</label>
                                    <input
                                      id={`admin-edit-phone-${subscription.id}`}
                                      className="auth-input"
                                      type="tel"
                                      placeholder={t("dashboard.subscription.phoneLabel")}
                                      value={editSubscriptionPhone}
                                      onChange={(e) => setEditSubscriptionPhone(e.target.value)}
                                      style={{ marginBottom: 0 }}
                                    />
                                  </div>
                                  <div style={{ flex: "1 1 160px" }}>
                                    <label className="auth-label" htmlFor={`admin-edit-ampere-${subscription.id}`}>{t("owner.subscribers.colAmpere")}</label>
                                    <input
                                      id={`admin-edit-ampere-${subscription.id}`}
                                      className="auth-input"
                                      type="number"
                                      placeholder={t("owner.subscribers.colAmpere")}
                                      value={editSubscriptionAmpere}
                                      onChange={(e) => setEditSubscriptionAmpere(e.target.value)}
                                      style={{ marginBottom: 0 }}
                                    />
                                  </div>
                                  <motion.button
                                    className="auth-button owner-submit-button"
                                    type="submit"
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    disabled={isSavingSubscription}
                                    style={{ marginTop: 0, width: "auto", padding: "0.6rem 1rem" }}
                                  >
                                    {isSavingSubscription ? <Loader2 size={14} className="btn-spinner" /> : t("common.save")}
                                  </motion.button>
                                  <motion.button
                                    className="dash-button-outline"
                                    type="button"
                                    onClick={handleCancelEditSubscription}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    style={{ marginTop: 0, width: "auto", padding: "0.6rem 1rem" }}
                                  >
                                    {t("common.cancel")}
                                  </motion.button>
                                </form>
                              ) : (
                                <>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", marginBottom: "1rem" }}>
                                    <div style={{ minWidth: "120px" }}>
                                      <p className="dash-label">{t("dashboard.subscription.address")}</p>
                                      <p className="dash-value-lg">{subscription.address || "—"}</p>
                                    </div>
                                    <div style={{ minWidth: "120px" }}>
                                      <p className="dash-label">{t("dashboard.subscription.building")}</p>
                                      <p className="dash-value-lg">{subscription.building || "—"}</p>
                                    </div>
                                    <div style={{ minWidth: "120px" }}>
                                      <p className="dash-label">{t("dashboard.subscription.phone")}</p>
                                      <p className="dash-value-lg">{subscription.phone || "—"}</p>
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
                                      <Pencil size={14} /> {t("admin.subscriptions.edit")}
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
                                          t("admin.subscriptions.deactivate")
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
                                          t("admin.subscriptions.activate")
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
