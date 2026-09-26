// Admin's bills page: revenue totals, all bills, marking bills as paid, and downloading invoices as images.
import { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { Receipt, DollarSign, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import api from "../../services/api";
import { useToast } from "../../hooks/useToast";
import { useTranslation } from "react-i18next";
import { getApiErrorMessage } from "../../utils/apiError";
import type { AdminDashboardContext, Bill } from "./AdminDashboardLayout";
import { CountUpValue } from "./shared";
import { statusPillClass, translateStatus, cardEntrance, cardHover, rowEntrance, rowHover } from "./helpers";

function BillsPage() {
  const showToast = useToast();
  const { t, i18n } = useTranslation();
  const { bills, setBills, revenue, fetchRevenue } = useOutletContext<AdminDashboardContext>();

  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [downloadingBillId, setDownloadingBillId] = useState<string | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const handleMarkPaid = async (billId: string) => {
    setMarkingPaidId(billId);
    try {
      await api.patch(`/bills/${billId}/mark-paid`);
      setBills((prev) =>
        prev.map((bill) => (bill.id === billId ? { ...bill, status: "paid" } : bill))
      );
      fetchRevenue();
    } catch (err) {
      showToast(getApiErrorMessage(err, t("admin.bills.toastMarkPaidFailed")), "error");
    } finally {
      setMarkingPaidId(null);
    }
  };

  useEffect(() => {
    if (!downloadingBillId) return;

    const billId = downloadingBillId;

    const timer = setTimeout(() => {
      if (!invoiceRef.current) {
        setDownloadingBillId(null);
        return;
      }

      html2canvas(invoiceRef.current, { backgroundColor: "#ffffff" })
        .then((canvas) => {
          const link = document.createElement("a");
          link.href = canvas.toDataURL("image/png");
          link.download = `invoice-${billId}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        })
        .catch(() => {
          showToast(i18n.t("dashboard.billing.toastInvoiceFailed"), "error");
        })
        .finally(() => {
          setDownloadingBillId(null);
        });
    }, 100);

    return () => clearTimeout(timer);
  }, [downloadingBillId, showToast, i18n]);

  const downloadInvoice = (bill: Bill) => {
    setDownloadingBillId(bill.id);
  };

  return (
    <>
      <div className="dash-page-title" style={{ fontSize: "1rem", marginTop: "0.5rem" }}>
        <DollarSign size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> {t("admin.bills.revenueOverview")}
      </div>

      <div className="admin-stats-grid">
        <motion.div
          className="stat-card stat-card-amber"
          {...cardEntrance(0)}
          whileHover={cardHover}
        >
          <p className="dash-label">{t("admin.bills.totalCollected")}</p>
          <p className="stat-number-amber">
            <CountUpValue value={revenue?.total_collected ?? 0} decimals={2} prefix="$" />
          </p>
        </motion.div>

        <motion.div
          className="stat-card stat-card-cyan"
          {...cardEntrance(1)}
          whileHover={cardHover}
        >
          <p className="dash-label">{t("admin.bills.outstanding")}</p>
          <p className="stat-number-cyan">
            <CountUpValue value={revenue?.total_outstanding ?? 0} decimals={2} prefix="$" />
          </p>
        </motion.div>
      </div>

      <motion.section
        id="bills"
        className="dash-card admin-section"
        {...cardEntrance(2)}
        whileHover={cardHover}
      >
        <h2 className="dash-card-title">
          <Receipt size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> {t("admin.bills.title")}
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
                  <th>{t("dashboard.billing.invoice")}</th>
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
                    <td>
                      <motion.button
                        className="dash-button-outline"
                        onClick={() => downloadInvoice(bill)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        disabled={downloadingBillId === bill.id}
                        style={{ marginTop: 0, width: "auto", padding: "0.4rem 0.75rem" }}
                      >
                        {downloadingBillId === bill.id ? (
                          <Loader2 size={14} className="btn-spinner" />
                        ) : (
                          t("dashboard.billing.download")
                        )}
                      </motion.button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {downloadingBillId && (() => {
          const invoiceBill = bills.find((b) => b.id === downloadingBillId);
          if (!invoiceBill) return null;
          return (
            <div
              ref={invoiceRef}
              style={{
                position: "fixed",
                top: 0,
                left: "-9999px",
                width: "480px",
                backgroundColor: "#ffffff",
                color: "#111111",
                padding: "32px",
                fontFamily: "Arial, sans-serif",
                border: "1px solid #dddddd",
                boxSizing: "border-box",
              }}
            >
              <div style={{ textAlign: "center", borderBottom: "2px solid #111111", paddingBottom: "16px", marginBottom: "16px" }}>
                <h1 style={{ margin: 0, fontSize: "24px", color: "#111111" }}>⚡ AK Power</h1>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#555555" }}>{t("dashboard.billing.invoiceHeader")}</p>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "6px 0", color: "#555555" }}>{t("dashboard.billing.invoiceSubscriber")}</td>
                    <td style={{ padding: "6px 0", textAlign: "right", fontWeight: 600, color: "#111111" }}>{invoiceBill.subscriber_name || invoiceBill.subscriber_id}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 0", color: "#555555" }}>{t("dashboard.billing.invoiceBillDate")}</td>
                    <td style={{ padding: "6px 0", textAlign: "right", color: "#111111" }}>{new Date(invoiceBill.created_at).toLocaleDateString(i18n.language)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 0", color: "#555555" }}>{t("dashboard.billing.invoiceDueDate")}</td>
                    <td style={{ padding: "6px 0", textAlign: "right", color: "#111111" }}>{new Date(invoiceBill.due_date).toLocaleDateString(i18n.language)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 0", color: "#555555" }}>{t("dashboard.billing.invoiceConsumption")}</td>
                    <td style={{ padding: "6px 0", textAlign: "right", color: "#111111" }}>{invoiceBill.consumption_kwh} {t("dashboard.billing.kwh")}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 0", color: "#555555" }}>{t("dashboard.billing.invoiceStatus")}</td>
                    <td style={{ padding: "6px 0", textAlign: "right", color: "#111111" }}>{translateStatus(t, invoiceBill.status)}</td>
                  </tr>
                </tbody>
              </table>
              <div
                style={{
                  borderTop: "2px solid #111111",
                  marginTop: "16px",
                  paddingTop: "16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "15px", fontWeight: 600, color: "#111111" }}>{t("dashboard.billing.invoiceTotal")}</span>
                <span style={{ fontSize: "20px", fontWeight: 700, color: "#111111" }}>${invoiceBill.amount.toFixed(2)}</span>
              </div>
              <p style={{ marginTop: "24px", fontSize: "11px", color: "#888888", textAlign: "center" }}>
                {t("dashboard.billing.invoiceFooter")}
              </p>
            </div>
          );
        })()}
      </motion.section>
    </>
  );
}

export default BillsPage;
