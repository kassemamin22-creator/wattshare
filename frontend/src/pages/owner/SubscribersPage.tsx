import { useMemo, useState, type FormEvent, Fragment } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Search, Loader2, Pencil, ChevronDown } from "lucide-react";
import { isAxiosError } from "axios";
import api from "../../services/api";
import { useToast } from "../../hooks/useToast";
import type { OwnerDashboardContext, Subscriber } from "./OwnerDashboardLayout";
import { statusPillClass, cardEntrance, cardHover, rowEntrance, rowHover } from "./shared";

function SubscribersPage() {
  const showToast = useToast();
  const { subscribers, fetchSubscribers } = useOutletContext<OwnerDashboardContext>();

  const [readingValues, setReadingValues] = useState<Record<string, string>>({});
  const [subscriberSearch, setSubscriberSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "all" | "pending" | "inactive">("active");
  const [buildingFilter, setBuildingFilter] = useState("");
  const [submittingReadingId, setSubmittingReadingId] = useState<string | null>(null);
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

  const handleSubmitReading = async (subscriberId: string, lastReading: number | null | undefined) => {
    const value = readingValues[subscriberId];
    const lastReadingLabel = lastReading != null ? lastReading : "No previous reading";
    if (!window.confirm(`Confirm meter reading: ${value}? Last recorded reading was ${lastReadingLabel}.`)) {
      return;
    }

    setSubmittingReadingId(subscriberId);

    try {
      await api.post("/meter-reading", {
        subscriber_id: subscriberId,
        reading_value: Number(readingValues[subscriberId]),
      });
      showToast("Reading submitted, bill generated", "success");
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        showToast(err.response!.data.detail, "error");
      } else {
        showToast("Failed to submit reading", "error");
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
      showToast("Subscriber updated successfully", "success");
      setEditingSubscriptionId(null);
      fetchSubscribers();
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        showToast(err.response.data.detail, "error");
      } else {
        showToast("Failed to update subscriber", "error");
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
        <Users size={18} className="dash-icon" style={{ color: "var(--color-cyan)" }} /> Subscribers
      </h2>
      <div className="auth-input-wrap">
        <Search size={16} className="auth-input-icon" />
        <input
          className="auth-input"
          type="text"
          placeholder="Search by name..."
          value={subscriberSearch}
          onChange={(e) => setSubscriberSearch(e.target.value)}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
        <p className="dash-label" style={{ margin: 0 }}>STATUS</p>
        <select
          className="owner-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "active" | "all" | "pending" | "inactive")}
          style={{ flex: "0 1 160px" }}
        >
          <option value="active">Active</option>
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
        </select>
        <p className="dash-label" style={{ margin: 0 }}>BUILDING</p>
        <select
          className="owner-select"
          value={buildingFilter}
          onChange={(e) => setBuildingFilter(e.target.value)}
          style={{ flex: "0 1 160px" }}
        >
          <option value="">All Buildings</option>
          {uniqueBuildings.map((building) => (
            <option key={building} value={building}>
              {building}
            </option>
          ))}
        </select>
      </div>
      {subscribers.length === 0 ? (
        <p>No subscribers yet</p>
      ) : filteredSubscribers.length === 0 ? (
        <p>No subscribers match your search</p>
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
                          {subscriber.status.toUpperCase()}
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
                                    <label className="auth-label" htmlFor={`owner-edit-address-${subscriber.id}`}>Address</label>
                                    <input
                                      id={`owner-edit-address-${subscriber.id}`}
                                      className="auth-input"
                                      type="text"
                                      placeholder="Address"
                                      value={editSubscriptionAddress}
                                      onChange={(e) => setEditSubscriptionAddress(e.target.value)}
                                      style={{ marginBottom: 0 }}
                                    />
                                  </div>
                                  <div style={{ flex: "1 1 160px" }}>
                                    <label className="auth-label" htmlFor={`owner-edit-building-${subscriber.id}`}>Building name or number</label>
                                    <input
                                      id={`owner-edit-building-${subscriber.id}`}
                                      className="auth-input"
                                      type="text"
                                      placeholder="Building name or number"
                                      value={editSubscriptionBuilding}
                                      onChange={(e) => setEditSubscriptionBuilding(e.target.value)}
                                      style={{ marginBottom: 0 }}
                                    />
                                  </div>
                                  <div style={{ flex: "1 1 160px" }}>
                                    <label className="auth-label" htmlFor={`owner-edit-phone-${subscriber.id}`}>Phone</label>
                                    <input
                                      id={`owner-edit-phone-${subscriber.id}`}
                                      className="auth-input"
                                      type="tel"
                                      placeholder="Phone"
                                      value={editSubscriptionPhone}
                                      onChange={(e) => setEditSubscriptionPhone(e.target.value)}
                                      style={{ marginBottom: 0 }}
                                    />
                                  </div>
                                  <div style={{ flex: "1 1 160px" }}>
                                    <label className="auth-label" htmlFor={`owner-edit-ampere-${subscriber.id}`}>Ampere</label>
                                    <input
                                      id={`owner-edit-ampere-${subscriber.id}`}
                                      className="auth-input"
                                      type="number"
                                      placeholder="Ampere"
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
                                      <p className="dash-value-lg">{subscriber.address || "—"}</p>
                                    </div>
                                    <div style={{ minWidth: "120px" }}>
                                      <p className="dash-label">BUILDING</p>
                                      <p className="dash-value-lg">{subscriber.building || "—"}</p>
                                    </div>
                                    <div style={{ minWidth: "120px" }}>
                                      <p className="dash-label">PHONE</p>
                                      <p className="dash-value-lg">{subscriber.phone || "—"}</p>
                                    </div>
                                    <div style={{ minWidth: "120px" }}>
                                      <p className="dash-label">LAST READING</p>
                                      <p className="dash-value-lg">
                                        {subscriber.last_reading != null ? subscriber.last_reading : "No previous reading"}
                                      </p>
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                                    <input
                                      className="auth-input owner-reading-input"
                                      type="number"
                                      placeholder="Reading value"
                                      value={readingValues[subscriber.subscriber_id] || ""}
                                      onChange={(e) =>
                                        handleReadingChange(subscriber.subscriber_id, e.target.value)
                                      }
                                      style={{ marginBottom: 0 }}
                                    />
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
                                        "Submit Reading"
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
