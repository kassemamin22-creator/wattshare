import { useState, type FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { UserPlus, Loader2 } from "lucide-react";
import { isAxiosError } from "axios";
import api from "../../services/api";
import { useToast } from "../../hooks/useToast";
import { useTranslation } from "react-i18next";
import type { OwnerDashboardContext } from "./OwnerDashboardLayout";
import { cardEntrance, cardHover, SUBSCRIBER_PAYMENT_METHODS } from "./shared";

function AddSubscriberPage() {
  const showToast = useToast();
  const { t } = useTranslation();
  const { fetchSubscribers } = useOutletContext<OwnerDashboardContext>();

  const [subscriberName, setSubscriberName] = useState("");
  const [subscriberEmail, setSubscriberEmail] = useState("");
  const [subscriberPassword, setSubscriberPassword] = useState("");
  const [subscriberAddress, setSubscriberAddress] = useState("");
  const [subscriberBuilding, setSubscriberBuilding] = useState("");
  const [subscriberPhone, setSubscriberPhone] = useState("");
  const [subscriberAmpere, setSubscriberAmpere] = useState("");
  const [subscriberPaymentMethod, setSubscriberPaymentMethod] = useState("cash");
  const [isAddingSubscriber, setIsAddingSubscriber] = useState(false);

  const handleAddSubscriber = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsAddingSubscriber(true);

    try {
      await api.post("/admin/add-subscriber", {
        name: subscriberName,
        email: subscriberEmail,
        password: subscriberPassword,
        address: subscriberAddress,
        building: subscriberBuilding,
        phone: subscriberPhone,
        ampere: Number(subscriberAmpere),
        payment_method: subscriberPaymentMethod,
      });
      showToast(t("owner.addSubscriber.toastSuccess"), "success");
      setSubscriberName("");
      setSubscriberEmail("");
      setSubscriberPassword("");
      setSubscriberAddress("");
      setSubscriberBuilding("");
      setSubscriberPhone("");
      setSubscriberAmpere("");
      setSubscriberPaymentMethod("cash");
      fetchSubscribers();
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        showToast(err.response.data.detail, "error");
      } else {
        showToast(t("owner.addSubscriber.toastFailed"), "error");
      }
    } finally {
      setIsAddingSubscriber(false);
    }
  };

  return (
    <motion.section
      id="add-subscriber"
      className="dash-card admin-section admin-form-card"
      {...cardEntrance(0)}
      whileHover={cardHover}
    >
      <h2 className="dash-card-title admin-form-title">
        <UserPlus size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> {t("owner.addSubscriber.title")}
      </h2>
      <form onSubmit={handleAddSubscriber} className="admin-form-grid">
        <div className="admin-form-field">
          <label className="auth-label" htmlFor="owner-add-subscriber-name">{t("register.name")}</label>
          <input
            id="owner-add-subscriber-name"
            className="auth-input"
            type="text"
            placeholder={t("register.name")}
            value={subscriberName}
            onChange={(e) => setSubscriberName(e.target.value)}
          />
        </div>
        <div className="admin-form-field">
          <label className="auth-label" htmlFor="owner-add-subscriber-email">{t("register.email")}</label>
          <input
            id="owner-add-subscriber-email"
            className="auth-input"
            type="email"
            placeholder={t("register.email")}
            value={subscriberEmail}
            onChange={(e) => setSubscriberEmail(e.target.value)}
          />
        </div>
        <div className="admin-form-field">
          <label className="auth-label" htmlFor="owner-add-subscriber-password">{t("register.password")}</label>
          <input
            id="owner-add-subscriber-password"
            className="auth-input"
            type="password"
            placeholder={t("register.password")}
            value={subscriberPassword}
            onChange={(e) => setSubscriberPassword(e.target.value)}
          />
        </div>
        <div className="admin-form-field">
          <label className="auth-label" htmlFor="owner-add-subscriber-ampere">{t("owner.subscribers.colAmpere")}</label>
          <input
            id="owner-add-subscriber-ampere"
            className="auth-input"
            type="number"
            placeholder={t("owner.subscribers.colAmpere")}
            value={subscriberAmpere}
            onChange={(e) => setSubscriberAmpere(e.target.value)}
          />
        </div>
        <div className="admin-form-field">
          <label className="auth-label" htmlFor="owner-add-subscriber-address">{t("dashboard.subscription.addressLabel")}</label>
          <input
            id="owner-add-subscriber-address"
            className="auth-input"
            type="text"
            placeholder={t("dashboard.subscription.addressLabel")}
            value={subscriberAddress}
            onChange={(e) => setSubscriberAddress(e.target.value)}
          />
        </div>
        <div className="admin-form-field">
          <label className="auth-label" htmlFor="owner-add-subscriber-building">{t("dashboard.subscription.buildingLabel")}</label>
          <input
            id="owner-add-subscriber-building"
            className="auth-input"
            type="text"
            placeholder={t("dashboard.subscription.buildingLabel")}
            value={subscriberBuilding}
            onChange={(e) => setSubscriberBuilding(e.target.value)}
          />
        </div>
        <div className="admin-form-field admin-form-full">
          <label className="auth-label" htmlFor="owner-add-subscriber-phone">{t("dashboard.subscription.phoneLabel")}</label>
          <input
            id="owner-add-subscriber-phone"
            className="auth-input"
            type="tel"
            placeholder={t("dashboard.subscription.phoneLabel")}
            value={subscriberPhone}
            onChange={(e) => setSubscriberPhone(e.target.value)}
          />
        </div>
        <div className="admin-form-full">
          <p className="dash-label">{t("owner.addSubscriber.paymentMethodLabel")}</p>
          <div className="payment-method-group">
            {SUBSCRIBER_PAYMENT_METHODS.map((method) => (
              <button
                key={method.value}
                type="button"
                className={
                  subscriberPaymentMethod === method.value
                    ? "payment-method-pill payment-method-pill-active"
                    : "payment-method-pill"
                }
                onClick={() => setSubscriberPaymentMethod(method.value)}
              >
                {t(`common.paymentMethod.${method.value}`)}
              </button>
            ))}
          </div>
        </div>
        <motion.button
          className="auth-button admin-form-full"
          type="submit"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          disabled={isAddingSubscriber}
        >
          {isAddingSubscriber ? <Loader2 size={16} className="btn-spinner" /> : t("owner.addSubscriber.submit")}
        </motion.button>
      </form>
    </motion.section>
  );
}

export default AddSubscriberPage;
