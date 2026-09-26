import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { UserCheck, Loader2 } from "lucide-react";
import { isAxiosError } from "axios";
import api from "../../services/api";
import { useToast } from "../../hooks/useToast";
import { useTranslation } from "react-i18next";
import type { OwnerDashboardContext } from "./OwnerDashboardLayout";
import { cardEntrance, cardHover, rowEntrance, rowHover } from "./helpers";

function PendingAmpereChangesPage() {
  const showToast = useToast();
  const { t } = useTranslation();
  const { subscribers, fetchSubscribers } = useOutletContext<OwnerDashboardContext>();

  const [approvingAmpereId, setApprovingAmpereId] = useState<string | null>(null);

  const approveAmpereChange = async (subscriptionId: string) => {
    setApprovingAmpereId(subscriptionId);

    try {
      await api.patch(`/admin/subscriptions/${subscriptionId}/approve-ampere-change`);
      showToast(t("owner.pendingAmpere.toastSuccess"), "success");
      fetchSubscribers();
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        showToast(err.response.data.detail, "error");
      } else {
        showToast(t("owner.pendingAmpere.toastFailed"), "error");
      }
    } finally {
      setApprovingAmpereId(null);
    }
  };

  const ampereChangeRequests = subscribers.filter(
    (subscriber) => subscriber.pending_ampere_change != null
  );

  return (
    <motion.section
      id="pending-ampere-changes"
      className="dash-card admin-section"
      {...cardEntrance(0)}
      whileHover={cardHover}
    >
      <h2 className="dash-card-title">
        <UserCheck size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> {t("owner.pendingAmpere.title")}
      </h2>
      {ampereChangeRequests.length === 0 ? (
        <p>{t("owner.pendingAmpere.emptyState")}</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("owner.pendingAmpere.colName")}</th>
                <th>{t("owner.pendingAmpere.colCurrent")}</th>
                <th>{t("owner.pendingAmpere.colRequested")}</th>
                <th>{t("owner.pendingAmpere.colAction")}</th>
              </tr>
            </thead>
            <tbody>
              {ampereChangeRequests.map((item, index) => (
                <motion.tr key={item.id} {...rowEntrance(index)} whileHover={rowHover}>
                  <td>{item.subscriber_name || item.subscriber_id}</td>
                  <td>{item.ampere}A</td>
                  <td>{item.pending_ampere_change}A</td>
                  <td>
                    <motion.button
                      className="auth-button owner-submit-button"
                      onClick={() => approveAmpereChange(item.id)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      disabled={approvingAmpereId === item.id}
                    >
                      {approvingAmpereId === item.id ? (
                        <Loader2 size={14} className="btn-spinner" />
                      ) : (
                        t("owner.pendingAmpere.approve")
                      )}
                    </motion.button>
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

export default PendingAmpereChangesPage;
