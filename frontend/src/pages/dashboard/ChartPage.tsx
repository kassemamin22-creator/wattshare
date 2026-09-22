import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import type { DashboardContext } from "./DashboardLayout";
import { CountUpValue, cardEntrance, cardHover } from "./shared";

function ChartPage() {
  const { bills } = useOutletContext<DashboardContext>();

  const totalConsumption = bills.reduce((sum, bill) => sum + bill.consumption_kwh, 0);
  const currentBalance = bills
    .filter((bill) => bill.status === "pending")
    .reduce((sum, bill) => sum + bill.amount, 0);

  const chartData = [...bills].reverse().map((bill) => ({
    date: new Date(bill.created_at).toLocaleDateString(),
    consumption_kwh: bill.consumption_kwh,
  }));

  return (
    <>
      <div className="admin-stats-grid">
        <motion.div
          className="stat-card stat-card-cyan"
          style={{ animation: "none" }}
          {...cardEntrance(0)}
          whileHover={cardHover}
        >
          <p className="dash-label">
            <BarChart3 size={18} className="dash-icon" style={{ color: "var(--color-cyan)" }} /> TOTAL CONSUMPTION
          </p>
          <p className="stat-number-cyan">
            <CountUpValue value={totalConsumption} suffix=" kWh" />
          </p>
        </motion.div>
        <motion.div
          className="stat-card stat-card-amber"
          style={{ animation: "none" }}
          {...cardEntrance(1)}
          whileHover={cardHover}
        >
          <p className="dash-label">CURRENT BALANCE</p>
          <p className="stat-number-amber">
            <CountUpValue value={currentBalance} decimals={2} suffix=" USD" />
          </p>
        </motion.div>
      </div>

      <motion.div
        id="chart"
        className="dash-card admin-section"
        style={{ animation: "none" }}
        {...cardEntrance(2)}
        whileHover={cardHover}
      >
        <h2 className="dash-card-title">
          <BarChart3 size={18} className="dash-icon" style={{ color: "var(--color-cyan)" }} /> Consumption Trend
        </h2>
        {bills.length < 2 ? (
          <p className="forecast-message">Chart will appear once you have more billing history</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} />
              <YAxis hide={true} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-surface-2)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  color: "var(--color-text)",
                }}
              />
              <Bar dataKey="consumption_kwh" fill="var(--color-cyan)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>
    </>
  );
}

export default ChartPage;
