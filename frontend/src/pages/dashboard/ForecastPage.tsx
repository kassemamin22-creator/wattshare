import { useEffect, useState, type CSSProperties } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, animate } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { DashboardContext } from "./DashboardLayout";
import { cardHover } from "./shared";

function ForecastPage() {
  const { prediction, bills } = useOutletContext<DashboardContext>();
  const [displayedForecast, setDisplayedForecast] = useState(0);

  useEffect(() => {
    if (prediction?.prediction == null) return;

    const controls = animate(0, prediction.prediction, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (latest) => setDisplayedForecast(latest),
    });

    return () => controls.stop();
  }, [prediction?.prediction]);

  const highestBillAmount = bills.reduce((max, bill) => Math.max(max, bill.amount), 0);
  const forecastPercent =
    prediction?.prediction != null && highestBillAmount > 0
      ? Math.min(100, (prediction.prediction / highestBillAmount) * 100)
      : 0;
  const forecastBarStyle = {
    "--fill-width": `${forecastPercent}%`,
  } as CSSProperties;

  return (
    <motion.div
      id="forecast"
      className="dash-card forecast-card admin-section"
      style={{ animation: "none" }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      whileHover={cardHover}
    >
      <p className="forecast-label">
        <Sparkles size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> AI FORECAST
      </p>
      {prediction && prediction.prediction !== null ? (
        <>
          <p className="forecast-amount">${displayedForecast.toFixed(2)}</p>
          <p className="forecast-hint">This is an estimate of your next bill, based on your past electricity usage.</p>
          <p className="forecast-message">{prediction.message}</p>
          <div className="forecast-bar-track">
            <div className="forecast-bar-fill" style={forecastBarStyle}></div>
          </div>
        </>
      ) : (
        <p className="forecast-message">{prediction?.message ?? "Loading..."}</p>
      )}
    </motion.div>
  );
}

export default ForecastPage;
