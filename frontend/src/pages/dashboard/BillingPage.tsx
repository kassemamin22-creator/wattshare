import { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { Receipt, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import { useToast } from "../../hooks/useToast";
import { useTranslation } from "react-i18next";
import type { Bill, DashboardContext } from "./DashboardLayout";
import { statusPillClass, translateStatus, cardEntrance, cardHover, rowEntrance, rowHover } from "./shared";

function BillingPage() {
  const showToast = useToast();
  const { t, i18n } = useTranslation();
  const { bills, profileName, displayName } = useOutletContext<DashboardContext>();

  const [downloadingBillId, setDownloadingBillId] = useState<string | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

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
          showToast(t("dashboard.billing.toastInvoiceFailed"), "error");
        })
        .finally(() => {
          setDownloadingBillId(null);
        });
    }, 100);

    return () => clearTimeout(timer);
  }, [downloadingBillId]);

  const downloadInvoice = (bill: Bill) => {
    setDownloadingBillId(bill.id);
  };

  return (
    <motion.div
      id="billing"
      className="dash-card admin-section"
      style={{ animation: "none" }}
      {...cardEntrance(0)}
      whileHover={cardHover}
    >
      <h2 className="dash-card-title">
        <Receipt size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> {t("dashboard.billing.title")}
      </h2>
      {bills.length === 0 ? (
        <p>{t("dashboard.billing.noBillsYet")}</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("dashboard.billing.kwh")}</th>
                <th>{t("dashboard.billing.date")}</th>
                <th>{t("dashboard.billing.dueDate")}</th>
                <th>{t("dashboard.billing.amount")}</th>
                <th>{t("dashboard.billing.invoiceStatus")}</th>
                <th>{t("dashboard.billing.invoice")}</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((bill, index) => (
                <motion.tr key={bill.id} {...rowEntrance(index)} whileHover={rowHover}>
                  <td>{bill.consumption_kwh} {t("dashboard.billing.kwh")}</td>
                  <td>{new Date(bill.created_at).toLocaleDateString(i18n.language)}</td>
                  <td>{new Date(bill.due_date).toLocaleDateString(i18n.language)}</td>
                  <td>${bill.amount.toFixed(2)}</td>
                  <td>
                    <span className={statusPillClass(bill.status)}>
                      <span className="pill-dot"></span>
                      {translateStatus(t, bill.status)}
                    </span>
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
                  <td style={{ padding: "6px 0", textAlign: "right", fontWeight: 600, color: "#111111" }}>{profileName || displayName}</td>
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
    </motion.div>
  );
}

export default BillingPage;
