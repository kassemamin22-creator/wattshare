import { useMemo, useRef, useState, type ChangeEvent, type FormEvent, Fragment } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Search, Loader2, Pencil, ChevronDown, Camera } from "lucide-react";
import { isAxiosError } from "axios";
import api from "../../services/api";
import { useToast } from "../../hooks/useToast";
import { useTranslation } from "react-i18next";
import type { OwnerDashboardContext, Subscriber } from "./OwnerDashboardLayout";
import { statusPillClass, translateStatus, cardEntrance, cardHover, rowEntrance, rowHover } from "./shared";

function SubscribersPage() {
  const showToast = useToast();
  const { t } = useTranslation();
  const { subscribers, fetchSubscribers } = useOutletContext<OwnerDashboardContext>();

  const [readingValues, setReadingValues] = useState<Record<string, string>>({});
  const [subscriberSearch, setSubscriberSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "all" | "pending" | "inactive">("active");
  const [buildingFilter, setBuildingFilter] = useState("");
  const [submittingReadingId, setSubmittingReadingId] = useState<string | null>(null);
  const [scanningId, setScanningId] = useState<string | null>(null);
  const scanInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [expandedSubscriberId, setExpandedSubscriberId] = useState<string | null>(null);
  const [editingSubscriptionId, setEditingSubscriptionId] = useState<string | null>(null);
  const [editSubscriptionAddress, setEditSubscriptionAddress] = useState("");
  const [editSubscriptionBuilding, setEditSubscriptionBuilding] = useState("");
  const [editSubscriptionPhone, setEditSubscriptionPhone] = useState("");
  const [editSubscriptionAmpere, setEditSubscriptionAmpere] = useState("");
  const [isSavingSubscription, setIsSavingSubscription] = useState(false);

  const toggleExpanded = (subscriberId: string) => {
    setExpandedSubscriberId((prev) => (prev === subscriberId ? null : subscriberId));
  };

  const handleReadingChange = (subscriberId: string, value: string) => {
    setReadingValues((prev) => ({ ...prev, [subscriberId]: value }));
  };

  const handleScanFile = async (subscriberId: string, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setScanningId(subscriberId);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await api.post("/meter-reading/ocr", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const scannedValue = response.data.reading_value;
      if (scannedValue !== null && scannedValue !== undefined) {
        handleReadingChange(subscriberId, String(scannedValue));
        showToast(t("owner.subscribers.toastScanned", { value: scannedValue }), "success");
      } else {
        showToast(t("owner.subscribers.toastScanNoNumber"), "error");
      }
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        showToast(err.response.data.detail, "error");
      } else {
        showToast(t("owner.subscribers.toastScanFailed"), "error");
      }
    } finally {
      setScanningId(null);
    }
  };

  const handleSubmitReading = async (subscriberId: string, lastReading: number | null | undefined) => {
    const value = readingValues[subscriberId];
    const lastReadingLabel = lastReading != null ? lastReading : t("owner.subscribers.noPreviousReading");
    if (!window.confirm(t("owner.subscribers.confirmReadingDialog", { value, lastReading: lastReadingLabel }))) {
      return;
    }

    setSubmittingReadingId(subscriberId);

    try {
      await api.post("/meter-reading", {
        subscriber_id: subscriberId,
        reading_value: Number(readingValues[subscriberId]),
      });
      showToast(t("owner.subscribers.toastReadingSuccess"), "success");
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        showToast(err.response!.data.detail, "error");
      } else {
        showToast(t("owner.subscribers.toastReadingFailed"), "error");
      }
    } finally {
      setSubmittingReadingId(null);
    }
  };

  const handleStartEditSubscription = (subscriber: Subscriber) => {
    setEditingSubscriptionId(subscriber.id);
    setEditSubscriptionAddress(subscriber.address);
    setEditSubscriptionBuilding(subscriber.building);
    setEditSubscriptionPhone(subscriber.phone);
    setEditSubscriptionAmpere(String(subscriber.ampere));
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
      showToast(t("owner.subscribers.toastUpdateSuccess"), "success");
      setEditingSubscriptionId(null);
      fetchSubscribers();
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        showToast(err.response.data.detail, "error");
      } else {
        showToast(t("owner.subscribers.toastUpdateFailed"), "error");
      }
    } finally {
      setIsSavingSubscription(false);
    }
  };

  const uniqueBuildings = useMemo(() => {
    const buildings = subscribers
      .map((subscriber) => subscriber.building)
      .filter((building): building is string => Boolean(building));
    return Array.from(new Set(buildings)).sort();
  }, [subscribers]);

  const filteredSubscribers = subscribers.filter((subscriber) => {
    const matchesSearch = (subscriber.subscriber_name || "")
      .toLowerCase()
      .includes(subscriberSearch.toLowerCase());
    const matchesStatus = statusFilter === "all" || subscriber.status === statusFilter;
    const matchesBuilding = buildingFilter === "" || subscriber.building === buildingFilter;
    return matchesSearch && matchesStatus && matchesBuilding;
  });

  return (
    <motion.section
      id="subscribers"
      className="dash-card admin-section"
      {...cardEntrance(0)}
      whileHover={cardHover}
    >
      <h2 className="dash-card-title">
        <Users size={18} className="dash-icon" style={{ color: "var(--color-cyan)" }} /> {t("owner.subscribers.title")}
      </h2>
      <div className="auth-input-wrap">
        <Search size={16} className="auth-input-icon" />
        <input
          className="auth-input"
          type="text"
          placeholder={t("owner.subscribers.searchPlaceholder")}
          value={subscriberSearch}
          onChange={(e) => setSubscriberSearch(e.target.value)}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
        <p className="dash-label" style={{ margin: 0 }}>{t("owner.subscribers.statusFilter")}</p>
        <select
          className="owner-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "active" | "all" | "pending" | "inactive")}
          style={{ flex: "0 1 160px" }}
        >
          <option value="active">{t("common.status.active")}</option>
          <option value="all">{t("owner.subscribers.statusAll")}</option>
          <option value="pending">{t("common.status.pending")}</option>
          <option value="inactive">{t("common.status.inactive")}</option>
        </select>
        <p className="dash-label" style={{ margin: 0 }}>{t("owner.subscribers.buildingFilter")}</p>
        <select
          className="owner-select"
          value={buildingFilter}
          onChange={(e) => setBuildingFilter(e.target.value)}
          style={{ flex: "0 1 160px" }}
        >
          <option value="">{t("owner.subscribers.buildingAll")}</option>
          {uniqueBuildings.map((building) => (
            <option key={building} value={building}>
              {building}
            </option>
          ))}
        </select>
      </div>
      {subscribers.length === 0 ? (
        <p>{t("owner.subscribers.emptyNoData")}</p>
      ) : filteredSubscribers.length === 0 ? (
        <p>{t("owner.subscribers.emptyNoMatch")}</p>
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
              {filteredSubscribers.map((subscriber, index) => {
                const isEditingThis = editingSubscriptionId === subscriber.id;
                const isExpanded = expandedSubscriberId === subscriber.id;
                const showDetails = isEditingThis || isExpanded;

                return (
                  <Fragment key={subscriber.id}>
                    <motion.tr {...rowEntrance(index)} whileHover={rowHover}>
                      <td>{subscriber.subscriber_name || subscriber.subscriber_id}</td>
                      <td>
                        <span className={statusPillClass(subscriber.status)}>
                          <span className="pill-dot"></span>
                          {translateStatus(t, subscriber.status)}
                        </span>
                      </td>
                      <td>{subscriber.ampere}A</td>
                      <td>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <motion.button
                            className="dash-button-outline"
                            onClick={() => handleStartEditSubscription(subscriber)}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            style={{ marginTop: 0, width: "auto", padding: "0.5rem 0.75rem" }}
                          >
                            <Pencil size={14} />
                          </motion.button>
                          <motion.button
                            className="dash-button-outline"
                            onClick={() => toggleExpanded(subscriber.id)}
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
                        </div>
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
                                    <label className="auth-label" htmlFor={`owner-edit-address-${subscriber.id}`}>{t("dashboard.subscription.addressLabel")}</label>
                                    <input
                                      id={`owner-edit-address-${subscriber.id}`}
                                      className="auth-input"
                                      type="text"
                                      placeholder={t("dashboard.subscription.addressLabel")}
                                      value={editSubscriptionAddress}
                                      onChange={(e) => setEditSubscriptionAddress(e.target.value)}
                                      style={{ marginBottom: 0 }}
                                    />
                                  </div>
                                  <div style={{ flex: "1 1 160px" }}>
                                    <label className="auth-label" htmlFor={`owner-edit-building-${subscriber.id}`}>{t("dashboard.subscription.buildingLabel")}</label>
                                    <input
                                      id={`owner-edit-building-${subscriber.id}`}
                                      className="auth-input"
                                      type="text"
                                      placeholder={t("dashboard.subscription.buildingLabel")}
                                      value={editSubscriptionBuilding}
                                      onChange={(e) => setEditSubscriptionBuilding(e.target.value)}
                                      style={{ marginBottom: 0 }}
                                    />
                                  </div>
                                  <div style={{ flex: "1 1 160px" }}>
                                    <label className="auth-label" htmlFor={`owner-edit-phone-${subscriber.id}`}>{t("dashboard.subscription.phoneLabel")}</label>
                                    <input
                                      id={`owner-edit-phone-${subscriber.id}`}
                                      className="auth-input"
                                      type="tel"
                                      placeholder={t("dashboard.subscription.phoneLabel")}
                                      value={editSubscriptionPhone}
                                      onChange={(e) => setEditSubscriptionPhone(e.target.value)}
                                      style={{ marginBottom: 0 }}
                                    />
                                  </div>
                                  <div style={{ flex: "1 1 160px" }}>
                                    <label className="auth-label" htmlFor={`owner-edit-ampere-${subscriber.id}`}>{t("owner.subscribers.colAmpere")}</label>
                                    <input
                                      id={`owner-edit-ampere-${subscriber.id}`}
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
                                      <p className="dash-value-lg">{subscriber.address || "—"}</p>
                                    </div>
                                    <div style={{ minWidth: "120px" }}>
                                      <p className="dash-label">{t("dashboard.subscription.building")}</p>
                                      <p className="dash-value-lg">{subscriber.building || "—"}</p>
                                    </div>
                                    <div style={{ minWidth: "120px" }}>
                                      <p className="dash-label">{t("dashboard.subscription.phone")}</p>
                                      <p className="dash-value-lg">{subscriber.phone || "—"}</p>
                                    </div>
                                    <div style={{ minWidth: "120px" }}>
                                      <p className="dash-label">{t("owner.subscribers.lastReading")}</p>
                                      <p className="dash-value-lg">
                                        {subscriber.last_reading != null ? subscriber.last_reading : t("owner.subscribers.noPreviousReading")}
                                      </p>
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                                    <input
                                      className="auth-input owner-reading-input"
                                      type="number"
                                      placeholder={t("owner.subscribers.readingPlaceholder")}
                                      value={readingValues[subscriber.subscriber_id] || ""}
                                      onChange={(e) =>
                                        handleReadingChange(subscriber.subscriber_id, e.target.value)
                                      }
                                      style={{ marginBottom: 0 }}
                                    />
                                    <input
                                      type="file"
                                      accept="image/*"
                                      capture="environment"
                                      style={{ display: "none" }}
                                      ref={(el) => {
                                        scanInputRefs.current[subscriber.subscriber_id] = el;
                                      }}
                                      onChange={(e) => handleScanFile(subscriber.subscriber_id, e)}
                                    />
                                    <motion.button
                                      className="dash-button-outline"
                                      type="button"
                                      onClick={() => scanInputRefs.current[subscriber.subscriber_id]?.click()}
                                      whileHover={{ scale: 1.03 }}
                                      whileTap={{ scale: 0.97 }}
                                      disabled={scanningId === subscriber.subscriber_id}
                                      style={{ marginTop: 0, width: "auto", padding: "0.6rem 0.75rem" }}
                                      aria-label={t("owner.subscribers.scanMeter")}
                                    >
                                      {scanningId === subscriber.subscriber_id ? (
                                        <Loader2 size={16} className="btn-spinner" />
                                      ) : (
                                        <Camera size={16} />
                                      )}
                                    </motion.button>
                                    <motion.button
                                      className="auth-button owner-submit-button"
                                      onClick={() => handleSubmitReading(subscriber.subscriber_id, subscriber.last_reading)}
                                      whileHover={{ scale: 1.03 }}
                                      whileTap={{ scale: 0.97 }}
                                      disabled={submittingReadingId === subscriber.subscriber_id}
                                      style={{ marginTop: 0, width: "auto" }}
                                    >
                                      {submittingReadingId === subscriber.subscriber_id ? (
                                        <Loader2 size={14} className="btn-spinner" />
                                      ) : (
                                        t("owner.subscribers.submitReading")
                                      )}
                                    </motion.button>
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

export default SubscribersPage;
