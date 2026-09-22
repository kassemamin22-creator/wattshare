import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { Receipt, DollarSign, Loader2 } from "lucide-react";
import api from "../../services/api";
import type { AdminDashboardContext } from "./AdminDashboardLayout";
import { statusPillClass, cardEntrance, cardHover, rowEntrance, rowHover, CountUpValue } from "./shared";

function BillsPage() {
  const { bills, setBills, revenue, fetchRevenue } = useOutletContext<AdminDashboardContext>();

  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

  const handleMarkPaid = async (billId: string) => {
    setMarkingPaidId(billId);
    try {
      await api.patch(`/bills/${billId}/mark-paid`);
      setBills((prev) =>
        prev.map((bill) => (bill.id === billId ? { ...bill, status: "paid" } : bill))
      );
      fetchRevenue();
    } catch {
      // mark-paid failed; leave the bill status as-is
    } finally {
      setMarkingPaidId(null);
    }
  };

  return (
    <>
      <div className="dash-page-title" style={{ fontSize: "1rem", marginTop: "0.5rem" }}>
        <DollarSign size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> Revenue Overview
      </div>

      <div className="admin-stats-grid">
        <motion.div
          className="stat-card stat-card-amber"
          {...cardEntrance(0)}
          whileHover={cardHover}
        >
          <p className="dash-label">Total Collected</p>
          <p className="stat-number-amber">
            <CountUpValue value={revenue?.total_collected ?? 0} decimals={2} prefix="$" />
          </p>
        </motion.div>

        <motion.div
          className="stat-card stat-card-cyan"
          {...cardEntrance(1)}
          whileHover={cardHover}
        >
          <p className="dash-label">Outstanding</p>
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
          <Receipt size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> Bills
        </h2>
        {bills.length === 0 ? (
          <p>No data yet</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Subscriber</th>
                  <th>Consumption</th>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill, index) => (
                  <motion.tr key={bill.id} {...rowEntrance(index)} whileHover={rowHover}>
                    <td>{bill.subscriber_name || bill.subscriber_id}</td>
                    <td>{bill.consumption_kwh} kWh</td>
                    <td>{new Date(bill.due_date).toLocaleDateString()}</td>
                    <td>${bill.amount.toFixed(2)}</td>
                    <td>
                      <span className={statusPillClass(bill.status)}>
                        <span className="pill-dot"></span>
                        {bill.status.toUpperCase()}
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
                            "Mark Paid"
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
    </>
  );
}

export default BillsPage;
