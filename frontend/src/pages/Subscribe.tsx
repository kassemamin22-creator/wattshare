import { useState, useEffect, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, MapPin, Phone, Home } from "lucide-react";
import { isAxiosError } from "axios";
import api from "../services/api";

const FEATURE_PILLS = [
  { icon: "⚡", label: "Instant activation" },
  { icon: "📈", label: "Live usage tracking" },
  { icon: "🛡️", label: "Fair tariff billing" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "whish", label: "Whish" },
  { value: "omt", label: "OMT" },
];

const PARTICLES = [
  { top: "8%", left: "12%", size: 3, color: "var(--color-accent)", duration: 5.4, delay: 0 },
  { top: "15%", left: "82%", size: 2, color: "var(--color-cyan)", duration: 6.2, delay: 0.3 },
  { top: "22%", left: "45%", size: 4, color: "var(--color-accent)", duration: 4.8, delay: 0.6 },
  { top: "30%", left: "68%", size: 2, color: "var(--color-cyan)", duration: 5.9, delay: 0.9 },
  { top: "38%", left: "20%", size: 3, color: "var(--color-accent)", duration: 6.7, delay: 1.2 },
  { top: "45%", left: "88%", size: 2, color: "var(--color-cyan)", duration: 4.5, delay: 0.2 },
  { top: "52%", left: "35%", size: 4, color: "var(--color-accent)", duration: 5.1, delay: 1.5 },
  { top: "60%", left: "75%", size: 3, color: "var(--color-cyan)", duration: 6.4, delay: 0.7 },
  { top: "65%", left: "10%", size: 2, color: "var(--color-accent)", duration: 4.9, delay: 1.8 },
  { top: "72%", left: "55%", size: 3, color: "var(--color-cyan)", duration: 5.6, delay: 0.4 },
  { top: "78%", left: "92%", size: 2, color: "var(--color-accent)", duration: 6.9, delay: 1.1 },
  { top: "85%", left: "25%", size: 4, color: "var(--color-cyan)", duration: 5.3, delay: 0.5 },
  { top: "10%", left: "60%", size: 2, color: "var(--color-accent)", duration: 4.6, delay: 2.0 },
  { top: "18%", left: "30%", size: 3, color: "var(--color-cyan)", duration: 6.0, delay: 1.4 },
  { top: "40%", left: "5%", size: 2, color: "var(--color-accent)", duration: 5.8, delay: 0.8 },
  { top: "55%", left: "48%", size: 3, color: "var(--color-cyan)", duration: 4.7, delay: 1.6 },
  { top: "68%", left: "65%", size: 4, color: "var(--color-accent)", duration: 6.3, delay: 0.1 },
  { top: "90%", left: "45%", size: 2, color: "var(--color-cyan)", duration: 5.0, delay: 1.9 },
];

function Subscribe() {
  const [ampere, setAmpere] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [error, setError] = useState("");
  const [pricePerAmpere, setPricePerAmpere] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/tariff").then((response) => setPricePerAmpere(response.data.price_per_ampere));
  }, []);

  const estimatedFee = ampere ? Number(ampere) * pricePerAmpere : 0;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!address.trim() || !phone.trim()) {
      setError("Address and phone are required");
      return;
    }

    try {
      await api.post("/subscription", {
        ampere: Number(ampere),
        address,
        phone,
        unit_number: unitNumber,
        payment_method: paymentMethod,
      });
      navigate("/dashboard");
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Subscription failed");
      }
    }
  };

  return (
    <div className="auth-split">
      <div className="auth-split-form">
        <div className="auth-mesh" aria-hidden="true">
          <motion.div
            className="auth-mesh-blob auth-mesh-blob-accent"
            animate={{ x: [0, 60, -40, 0], y: [0, -50, 40, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="auth-mesh-blob auth-mesh-blob-cyan"
            animate={{ x: [0, -70, 50, 0], y: [0, 60, -30, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="auth-mesh-blob auth-mesh-blob-accent2"
            animate={{ x: [0, 40, -60, 0], y: [0, 30, -50, 0] }}
            transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
          />
        </div>
        <motion.div
          className="auth-form-panel"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="auth-logo-wrap">
            <div className="auth-logo-glow"></div>
            <div className="auth-logo">⚡ WattShare</div>
          </div>
          <div className="auth-title">Subscribe to a Generator</div>
          <div className="auth-glass-card">
            <form onSubmit={handleSubmit}>
              <div className="auth-input-wrap">
                <MapPin size={16} className="auth-input-icon" />
                <input
                  className="auth-input"
                  type="text"
                  placeholder="Address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>
              <div className="auth-input-wrap">
                <Phone size={16} className="auth-input-icon" />
                <input
                  className="auth-input"
                  type="tel"
                  placeholder="Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <div className="auth-input-wrap">
                <Home size={16} className="auth-input-icon" />
                <input
                  className="auth-input"
                  type="text"
                  placeholder="Additional Details (optional) - Apt, floor, street landmark..."
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                />
              </div>
              <p className="dash-label">Payment Method</p>
              <div className="payment-method-group">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.value}
                    type="button"
                    className={
                      paymentMethod === method.value
                        ? "payment-method-pill payment-method-pill-active"
                        : "payment-method-pill"
                    }
                    onClick={() => setPaymentMethod(method.value)}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
              <div className="auth-input-wrap">
                <Zap size={16} className="auth-input-icon" />
                <input
                  className="auth-input"
                  type="number"
                  placeholder="Ampere"
                  value={ampere}
                  onChange={(e) => setAmpere(e.target.value)}
                />
              </div>
              <p className="auth-fee-estimate">
                Estimated monthly fee: ${estimatedFee.toFixed(2)}
              </p>
              <div className="auth-button-ring">
                <motion.button
                  className="auth-button"
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Subscribe
                </motion.button>
              </div>
              {error && <div className="auth-error">{error}</div>}
            </form>
          </div>
        </motion.div>
      </div>
      <div className="auth-split-image">
        <div className="auth-particles" aria-hidden="true">
          {PARTICLES.map((particle, index) => (
            <motion.div
              key={index}
              className="auth-particle"
              style={{
                top: particle.top,
                left: particle.left,
                width: particle.size,
                height: particle.size,
                backgroundColor: particle.color,
              }}
              animate={{ y: [0, -15, 0], opacity: [0.3, 0.7, 0.3] }}
              transition={{
                duration: particle.duration,
                delay: particle.delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
        <div className="auth-image-content">
          <motion.h1
            className="auth-image-headline"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          >
            Join the Grid
          </motion.h1>
          <motion.p
            className="auth-image-tagline"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.35, ease: "easeOut" }}
          >
            Subscribe to your neighborhood generator in seconds.
          </motion.p>
          <div className="auth-feature-pills">
            {FEATURE_PILLS.map((feature, index) => (
              <motion.div
                key={feature.label}
                className="auth-feature-pill"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.55 + index * 0.1, ease: "easeOut" }}
              >
                <span>{feature.icon}</span> {feature.label}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Subscribe;
