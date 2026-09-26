// Manager's pending approvals page: approve new subscription requests and choose their payment method.
import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { UserCheck, Loader2 } from "lucide-react";
import { isAxiosError } from "axios";
import api from "../../services/api";
import { useToast } from "../../hooks/useToast";
import { useTranslation } from "react-i18next";
import type { OwnerDashboardContext } from "./OwnerDashboardLayout";
import { cardEntrance, cardHover, rowEntrance, rowHover, SUBSCRIBER_PAYMENT_METHODS } from "./helpers";

function PendingApprovalsPage() {
  const showToast = useToast();
  const { t } = useTranslation();
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
      showToast(t("owner.pendingApprovals.toastSuccess"), "success");
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        showToast(err.response.data.detail, "error");
      } else {
        showToast(t("owner.pendingApprovals.toastFailed"), "error");
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
        <UserCheck size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> {t("owner.pendingApprovals.title")}
      </h2>
      {pendingSubscriptions.length === 0 ? (
        <p>{t("owner.pendingApprovals.emptyState")}</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("owner.pendingApprovals.colName")}</th>
                <th>{t("owner.pendingApprovals.colPhone")}</th>
                <th>{t("owner.pendingApprovals.colAddress")}</th>
                <th>{t("owner.pendingApprovals.colAmpere")}</th>
                <th>{t("owner.pendingApprovals.colAction")}</th>
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
                              {t(`common.paymentMethod.${method.value}`)}
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
                              t("owner.pendingApprovals.confirmApproval")
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
                            {t("common.cancel")}
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
                        {t("owner.pendingApprovals.approve")}
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
