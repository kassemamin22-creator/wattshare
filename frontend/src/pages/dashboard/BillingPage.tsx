import { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { Receipt, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import { useToast } from "../../hooks/useToast";
import type { Bill, DashboardContext } from "./DashboardLayout";
import { statusPillClass, cardEntrance, cardHover, rowEntrance, rowHover } from "./shared";

function BillingPage() {
  const showToast = useToast();
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
          showToast("Failed to generate invoice", "error");
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
        <Receipt size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> Billing History
      </h2>
      {bills.length === 0 ? (
        <p>No bills yet</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>kWh</th>
                <th>Date</th>
                <th>Due Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Invoice</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((bill, index) => (
                <motion.tr key={bill.id} {...rowEntrance(index)} whileHover={rowHover}>
                  <td>{bill.consumption_kwh} kWh</td>
                  <td>{new Date(bill.created_at).toLocaleDateString()}</td>
                  <td>{new Date(bill.due_date).toLocaleDateString()}</td>
                  <td>${bill.amount.toFixed(2)}</td>
                  <td>
                    <span className={statusPillClass(bill.status)}>
                      <span className="pill-dot"></span>
                      {bill.status.toUpperCase()}
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
                        "Download"
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
              <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#555555" }}>Electricity Bill Invoice</p>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <tbody>
                <tr>
                  <td style={{ padding: "6px 0", color: "#555555" }}>Subscriber</td>
                  <td style={{ padding: "6px 0", textAlign: "right", fontWeight: 600, color: "#111111" }}>{profileName || displayName}</td>
                </tr>
                <tr>
                  <td style={{ padding: "6px 0", color: "#555555" }}>Bill Date</td>
                  <td style={{ padding: "6px 0", textAlign: "right", color: "#111111" }}>{new Date(invoiceBill.created_at).toLocaleDateString()}</td>
                </tr>
                <tr>
                  <td style={{ padding: "6px 0", color: "#555555" }}>Due Date</td>
                  <td style={{ padding: "6px 0", textAlign: "right", color: "#111111" }}>{new Date(invoiceBill.due_date).toLocaleDateString()}</td>
                </tr>
                <tr>
                  <td style={{ padding: "6px 0", color: "#555555" }}>Consumption</td>
                  <td style={{ padding: "6px 0", textAlign: "right", color: "#111111" }}>{invoiceBill.consumption_kwh} kWh</td>
                </tr>
                <tr>
                  <td style={{ padding: "6px 0", color: "#555555" }}>Status</td>
                  <td style={{ padding: "6px 0", textAlign: "right", color: "#111111" }}>{invoiceBill.status.toUpperCase()}</td>
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
              <span style={{ fontSize: "15px", fontWeight: 600, color: "#111111" }}>Total Amount</span>
              <span style={{ fontSize: "20px", fontWeight: 700, color: "#111111" }}>${invoiceBill.amount.toFixed(2)}</span>
            </div>
            <p style={{ marginTop: "24px", fontSize: "11px", color: "#888888", textAlign: "center" }}>
              This is a system-generated invoice from WattShare. For questions, contact your account manager.
            </p>
          </div>
        );
      })()}
    </motion.div>
  );
}

export default BillingPage;
