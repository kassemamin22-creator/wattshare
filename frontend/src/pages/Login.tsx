import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Mail, Lock, Phone } from "lucide-react";
import { isAxiosError } from "axios";
import { jwtDecode } from "jwt-decode";
import api from "../services/api";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { translateErrorDetail } from "../utils/apiError";

const FEATURE_PILLS = [
  { icon: "⚡", label: "Real-time billing" },
  { icon: "📊", label: "AI predictions" },
  { icon: "🔒", label: "Secure access" },
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

interface DecodedToken {
  id: string;
  role: string;
  exp: number;
}

function Login() {
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState("");
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSelectMethod = (method: "email" | "phone") => {
    setLoginMethod(method);
    setIdentifier("");
    setError("");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    try {
      const response = await api.post("/login", { identifier, password });
      const token = response.data.access_token;
      localStorage.setItem("token", token);

      const decoded = jwtDecode<DecodedToken>(token);
      if (decoded.role === "owner") {
        navigate("/owner");
      } else if (decoded.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      const detail = isAxiosError(err) ? err.response?.data?.detail : undefined;
      const codedMessage = translateErrorDetail(detail);
      if (codedMessage) {
        setError(codedMessage);
      } else if (typeof detail === "string" && detail) {
        setError(detail);
      } else if (Array.isArray(detail)) {
        const messages = detail
          .map((item) => (typeof item?.msg === "string" ? item.msg.replace(/^Value error, /, "") : ""))
          .filter(Boolean);
        setError(messages.length > 0 ? messages.join("; ") : "Login failed");
      } else {
        setError("Login failed");
      }
    }
  };

  return (
    <div className="auth-split">
      <div className="auth-split-form">
        <LanguageSwitcher className="language-switcher-corner" />
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
            <button
              className="auth-logo"
              type="button"
              onClick={() => navigate("/")}
              style={{ background: "none", border: "none", cursor: "pointer", font: "inherit", color: "inherit" }}
            >
              ⚡ WattShare
            </button>
          </div>
          <div className="auth-title">{t("login.title")}</div>
          <div className="auth-glass-card">
            <form onSubmit={handleSubmit}>
              <div className="payment-method-group">
                <button
                  type="button"
                  className={
                    loginMethod === "email"
                      ? "payment-method-pill payment-method-pill-active"
                      : "payment-method-pill"
                  }
                  onClick={() => handleSelectMethod("email")}
                >
                  {t("login.email")}
                </button>
                <button
                  type="button"
                  className={
                    loginMethod === "phone"
                      ? "payment-method-pill payment-method-pill-active"
                      : "payment-method-pill"
                  }
                  onClick={() => handleSelectMethod("phone")}
                >
                  {t("login.phone")}
                </button>
              </div>
              <label className="auth-label" htmlFor="login-identifier">
                {loginMethod === "email" ? t("login.email") : t("login.phone")}
              </label>
              <div className="auth-input-wrap">
                {loginMethod === "email" ? (
                  <Mail size={16} className="auth-input-icon" />
                ) : (
                  <Phone size={16} className="auth-input-icon" />
                )}
                <input
                  id="login-identifier"
                  className="auth-input"
                  type={loginMethod === "email" ? "email" : "tel"}
                  placeholder={loginMethod === "email" ? t("login.email") : "+96170123456"}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
              <label className="auth-label" htmlFor="login-password">{t("login.password")}</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input
                  id="login-password"
                  className="auth-input"
                  type="password"
                  placeholder={t("login.password")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="auth-button-ring">
                <motion.button
                  className="auth-button"
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {t("login.submit")}
                </motion.button>
              </div>
              {error && <div className="auth-error">{error}</div>}
            </form>
          </div>
          <Link className="auth-link" to="/register">
            {t("login.noAccount")} {t("login.registerLink")}
          </Link>
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
            Power Your Community
          </motion.h1>
          <motion.p
            className="auth-image-tagline"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.35, ease: "easeOut" }}
          >
            Smart generator subscription management for modern neighborhoods.
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

export default Login;
