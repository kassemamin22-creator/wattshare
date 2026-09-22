import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import type { OwnerDashboardContext } from "./OwnerDashboardLayout";
import { cardEntrance, cardHover } from "./shared";

function ChartPage() {
  const { subscribers } = useOutletContext<OwnerDashboardContext>();

  const chartData = subscribers.map((subscriber, index) => ({
    label: `Sub ${index + 1}`,
    ampere: subscriber.ampere,
  }));

  return (
    <motion.section
      id="chart"
      className="dash-card admin-section"
      {...cardEntrance(0)}
      whileHover={cardHover}
    >
      <h2 className="dash-card-title">
        <BarChart3 size={18} className="dash-icon" style={{ color: "var(--color-cyan)" }} /> Subscriber Consumption Overview
      </h2>
      {subscribers.length === 0 ? (
        <p className="forecast-message">Chart will appear once you have subscribers</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} />
            <YAxis hide={true} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                color: "var(--color-text)",
              }}
            />
            <Bar dataKey="ampere" fill="var(--color-cyan)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </motion.section>
  );
}

export default ChartPage;
