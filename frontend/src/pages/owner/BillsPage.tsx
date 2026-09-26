import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { Receipt, Loader2 } from "lucide-react";
import api from "../../services/api";
import { useToast } from "../../hooks/useToast";
import { useTranslation } from "react-i18next";
import { getApiErrorMessage } from "../../utils/apiError";
import type { OwnerDashboardContext } from "./OwnerDashboardLayout";
import { statusPillClass, translateStatus, cardEntrance, cardHover, rowEntrance, rowHover } from "./helpers";

function BillsPage() {
  const { bills, setBills } = useOutletContext<OwnerDashboardContext>();
  const showToast = useToast();
  const { t, i18n } = useTranslation();

  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

  const handleMarkPaid = async (billId: string) => {
    setMarkingPaidId(billId);
    try {
      await api.patch(`/bills/${billId}/mark-paid`);
      setBills((prev) =>
        prev.map((bill) => (bill.id === billId ? { ...bill, status: "paid" } : bill))
      );
    } catch (err) {
      showToast(getApiErrorMessage(err, t("owner.bills.toastMarkPaidFailed")), "error");
    } finally {
      setMarkingPaidId(null);
    }
  };

  return (
    <motion.section
      id="bills"
      className="dash-card admin-section"
      {...cardEntrance(0)}
      whileHover={cardHover}
    >
      <h2 className="dash-card-title">
        <Receipt size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> {t("owner.bills.title")}
      </h2>
      {bills.length === 0 ? (
        <p>{t("owner.bills.emptyState")}</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("owner.bills.colSubscriber")}</th>
                <th>{t("owner.bills.colConsumption")}</th>
                <th>{t("owner.bills.colDueDate")}</th>
                <th>{t("owner.bills.colAmount")}</th>
                <th>{t("owner.bills.colStatus")}</th>
                <th>{t("owner.bills.colAction")}</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((bill, index) => (
                <motion.tr key={bill.id} {...rowEntrance(index)} whileHover={rowHover}>
                  <td>{bill.subscriber_name || bill.subscriber_id}</td>
                  <td>{bill.consumption_kwh} {t("dashboard.billing.kwh")}</td>
                  <td>{new Date(bill.due_date).toLocaleDateString(i18n.language)}</td>
                  <td>${bill.amount.toFixed(2)}</td>
                  <td>
                    <span className={statusPillClass(bill.status)}>
                      <span className="pill-dot"></span>
                      {translateStatus(t, bill.status)}
                    </span>
                  </td>
                  <td>
                    {bill.status === "pending" && (
                      <motion.button
                        className="auth-button owner-submit-button"
                        onClick={() => handleMarkPaid(bill.id)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        disabled={markingPaidId === bill.id}
                      >
                        {markingPaidId === bill.id ? (
                          <Loader2 size={14} className="btn-spinner" />
                        ) : (
                          t("owner.bills.markPaid")
                        )}
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

export default BillsPage;
