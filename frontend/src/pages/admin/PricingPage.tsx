import { useEffect, useState, type FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { DollarSign, Loader2 } from "lucide-react";
import { isAxiosError } from "axios";
import api from "../../services/api";
import { useToast } from "../../hooks/useToast";
import type { AdminDashboardContext } from "./AdminDashboardLayout";
import { cardEntrance, cardHover, CountUpValue } from "./shared";

function PricingPage() {
  const showToast = useToast();
  const { tariffPrice, setTariffPrice } = useOutletContext<AdminDashboardContext>();

  const [tariffInput, setTariffInput] = useState("");
  const [isUpdatingTariff, setIsUpdatingTariff] = useState(false);

  useEffect(() => {
    if (tariffPrice !== null) {
      setTariffInput(String(tariffPrice));
    }
  }, [tariffPrice]);

  const handleUpdateTariff = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUpdatingTariff(true);

    try {
      const response = await api.put("/admin/tariff", {
        price_per_ampere: Number(tariffInput),
      });
      setTariffPrice(response.data.price_per_ampere);
      showToast("Price updated successfully", "success");
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        showToast(err.response.data.detail, "error");
      } else {
        showToast("Failed to update price", "error");
      }
    } finally {
      setIsUpdatingTariff(false);
    }
  };

  return (
    <motion.section
      id="pricing"
      className="dash-card admin-section"
      {...cardEntrance(0)}
      whileHover={cardHover}
    >
      <h2 className="dash-card-title">
        <DollarSign size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> Pricing Control
      </h2>
      <p className="dash-label">CURRENT PRICE PER AMPERE</p>
      <p className="dash-value-lg">
        {tariffPrice !== null ? (
          <CountUpValue value={tariffPrice} decimals={2} prefix="$" />
        ) : (
          "Loading..."
        )}
      </p>
      <form onSubmit={handleUpdateTariff} className="admin-manager-form">
        <input
          className="auth-input"
          type="number"
          step="0.01"
          placeholder="Price per ampere"
          value={tariffInput}
          onChange={(e) => setTariffInput(e.target.value)}
        />
        <motion.button
          className="auth-button"
          type="submit"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          disabled={isUpdatingTariff}
        >
          {isUpdatingTariff ? <Loader2 size={16} className="btn-spinner" /> : "Update Price"}
        </motion.button>
      </form>
    </motion.section>
  );
}

export default PricingPage;
