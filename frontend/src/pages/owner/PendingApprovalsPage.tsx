import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { UserCheck, Loader2 } from "lucide-react";
import { isAxiosError } from "axios";
import api from "../../services/api";
import { useToast } from "../../hooks/useToast";
import type { OwnerDashboardContext } from "./OwnerDashboardLayout";
import { cardEntrance, cardHover, rowEntrance, rowHover, SUBSCRIBER_PAYMENT_METHODS } from "./shared";

function PendingApprovalsPage() {
  const showToast = useToast();
  const { pendingSubscriptions, setPendingSubscriptions } = useOutletContext<OwnerDashboardContext>();

  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvingSubscriptionId, setApprovingSubscriptionId] = useState<string | null>(null);
  const [selectedApprovalPaymentMethod, setSelectedApprovalPaymentMethod] = useState("cash");

  const handleShowApprovalPicker = (id: string) => {
    setApprovingSubscriptionId(id);
    setSelectedApprovalPaymentMethod("cash");
  };

  const handleCancelApproval = () => {
    setApprovingSubscriptionId(null);
  };

  const approveSubscription = async (id: string) => {
    setApprovingId(id);

    try {
      await api.patch(`/owner/subscriptions/${id}/approve`, {
        payment_method: selectedApprovalPaymentMethod,
      });
      setPendingSubscriptions((prev) => prev.filter((item) => item.id !== id));
      setApprovingSubscriptionId(null);
      showToast("Subscription approved", "success");
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        showToast(err.response.data.detail, "error");
      } else {
        showToast("Failed to approve subscription", "error");
      }
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <motion.section
      id="pending-approvals"
      className="dash-card admin-section"
      {...cardEntrance(0)}
      whileHover={cardHover}
    >
      <h2 className="dash-card-title">
        <UserCheck size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> Pending Approvals
      </h2>
      {pendingSubscriptions.length === 0 ? (
        <p>No pending requests</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Subscriber Name</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Ampere</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingSubscriptions.map((item, index) => (
                <motion.tr key={item.id} {...rowEntrance(index)} whileHover={rowHover}>
                  <td>{item.subscriber_name || item.subscriber_id}</td>
                  <td>{item.phone}</td>
                  <td>{item.address}</td>
                  <td>{item.ampere}A</td>
                  <td>
                    {approvingSubscriptionId === item.id ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-start" }}>
                        <div className="payment-method-group">
                          {SUBSCRIBER_PAYMENT_METHODS.map((method) => (
                            <button
                              key={method.value}
                              type="button"
                              className={
                                selectedApprovalPaymentMethod === method.value
                                  ? "payment-method-pill payment-method-pill-active"
                                  : "payment-method-pill"
                              }
                              onClick={() => setSelectedApprovalPaymentMethod(method.value)}
                            >
                              {method.label}
                            </button>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <motion.button
                            className="auth-button owner-submit-button"
                            onClick={() => approveSubscription(item.id)}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            disabled={approvingId === item.id}
                            style={{ marginTop: 0, width: "auto", padding: "0.6rem 1rem" }}
                          >
                            {approvingId === item.id ? (
                              <Loader2 size={14} className="btn-spinner" />
                            ) : (
                              "Confirm Approval"
                            )}
                          </motion.button>
                          <motion.button
                            className="dash-button-outline"
                            type="button"
                            onClick={handleCancelApproval}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            style={{ marginTop: 0, width: "auto", padding: "0.6rem 1rem" }}
                          >
                            Cancel
                          </motion.button>
                        </div>
                      </div>
                    ) : (
                      <motion.button
                        className="auth-button owner-submit-button"
                        onClick={() => handleShowApprovalPicker(item.id)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        Approve
                      </motion.button>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.section>
  );
}

export default PendingApprovalsPage;
