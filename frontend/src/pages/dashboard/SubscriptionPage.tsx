import { useState, type FormEvent } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Loader2 } from "lucide-react";
import { isAxiosError } from "axios";
import api from "../../services/api";
import { useToast } from "../../hooks/useToast";
import { useTranslation } from "react-i18next";
import type { DashboardContext } from "./DashboardLayout";
import { statusPillClass, translateStatus, cardEntrance, cardHover } from "./shared";

function SubscriptionPage() {
  const showToast = useToast();
  const { t } = useTranslation();
  const { subscription, setSubscription, hasSubscription, fetchSubscription } =
    useOutletContext<DashboardContext>();

  const [isEditing, setIsEditing] = useState(false);
  const [editAddress, setEditAddress] = useState("");
  const [editBuilding, setEditBuilding] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [requestedAmpere, setRequestedAmpere] = useState("");
  const [isRequestingAmpereChange, setIsRequestingAmpereChange] = useState(false);

  const handleStartEditing = () => {
    if (!subscription) return;
    setEditAddress(subscription.address);
    setEditBuilding(subscription.building);
    setEditPhone(subscription.phone);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
  };

  const handleSaveEditing = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSavingEdit(true);

    try {
      const response = await api.patch("/subscription/me", {
        address: editAddress,
        building: editBuilding,
        phone: editPhone,
      });
      setSubscription(response.data);
      setIsEditing(false);
      showToast(t("dashboard.subscription.toastUpdateSuccess"), "success");
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        showToast(err.response.data.detail, "error");
      } else {
        showToast(t("dashboard.subscription.toastUpdateFailed"), "error");
      }
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleRequestAmpereChange = async () => {
    setIsRequestingAmpereChange(true);

    try {
      await api.post("/subscription/me/request-ampere-change", {
        ampere: Number(requestedAmpere),
      });
      showToast(t("dashboard.subscription.toastAmpereRequested"), "success");
      setRequestedAmpere("");
      fetchSubscription();
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        showToast(err.response.data.detail, "error");
      } else {
        showToast(t("dashboard.subscription.toastAmpereFailed"), "error");
      }
    } finally {
      setIsRequestingAmpereChange(false);
    }
  };

  return (
    <motion.div
      id="subscription"
      className="dash-card admin-section"
      style={{ animation: "none" }}
      {...cardEntrance(0)}
      whileHover={cardHover}
    >
      <h2 className="dash-card-title">
        <Zap size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> {t("dashboard.subscription.title")}
      </h2>
      {subscription ? (
        <>
          <p className="dash-label">{t("dashboard.subscription.assignedGenerator")}</p>
          <p className="dash-value-lg">{subscription.generator_name}</p>
          <hr className="dash-divider" />
          <div className="dash-cols">
            <div className="dash-col">
              <p className="dash-label">{t("dashboard.subscription.tier")}</p>
              <p className="dash-value-lg">{t("dashboard.subscription.amperes", { value: subscription.ampere })}</p>
            </div>
            <div className="dash-col">
              <p className="dash-label">{t("dashboard.subscription.status")}</p>
              <span className={statusPillClass(subscription.status)}>
                {translateStatus(t, subscription.status)}
              </span>
            </div>
          </div>
          {subscription.pending_ampere_change != null ? (
            <span className="pill pill-warning">
              {t("dashboard.subscription.ampereChangeRequested", { value: subscription.pending_ampere_change })}
            </span>
          ) : (
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label className="auth-label" htmlFor="subscription-requested-ampere">{t("dashboard.subscription.newAmpereValue")}</label>
                <input
                  id="subscription-requested-ampere"
                  className="auth-input"
                  type="number"
                  placeholder={t("dashboard.subscription.newAmpereValue")}
                  value={requestedAmpere}
                  onChange={(e) => setRequestedAmpere(e.target.value)}
                  style={{ marginBottom: 0 }}
                />
              </div>
              <motion.button
                className="dash-button-outline"
                type="button"
                onClick={handleRequestAmpereChange}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                disabled={isRequestingAmpereChange}
                style={{ marginTop: 0, width: "auto", padding: "0.6rem 1rem" }}
              >
                {isRequestingAmpereChange ? <Loader2 size={16} className="btn-spinner" /> : t("dashboard.subscription.requestChange")}
              </motion.button>
            </div>
          )}
          <hr className="dash-divider" />
          {!isEditing && (
            <>
              <div className="dash-cols">
                <div className="dash-col">
                  <p className="dash-label">{t("dashboard.subscription.address")}</p>
                  <p className="dash-value-lg">{subscription.address}</p>
                </div>
                <div className="dash-col">
                  <p className="dash-label">{t("dashboard.subscription.building")}</p>
                  <p className="dash-value-lg">{subscription.building}</p>
                </div>
                <div className="dash-col">
                  <p className="dash-label">{t("dashboard.subscription.phone")}</p>
                  <p className="dash-value-lg">{subscription.phone}</p>
                </div>
              </div>
              <motion.button
                className="dash-button-outline"
                onClick={handleStartEditing}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {t("dashboard.subscription.editDetails")}
              </motion.button>
            </>
          )}
          <AnimatePresence initial={false}>
            {isEditing && (
              <motion.div
                key="edit-subscription-form"
                initial={{ height: 0, opacity: 0, y: -8 }}
                animate={{ height: "auto", opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                style={{ overflow: "hidden" }}
              >
                <form onSubmit={handleSaveEditing}>
                  <label className="auth-label" htmlFor="subscription-edit-address">{t("dashboard.subscription.addressLabel")}</label>
                  <input
                    id="subscription-edit-address"
                    className="auth-input"
                    type="text"
                    placeholder={t("dashboard.subscription.addressLabel")}
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                  />
                  <label className="auth-label" htmlFor="subscription-edit-building">{t("dashboard.subscription.buildingLabel")}</label>
                  <input
                    id="subscription-edit-building"
                    className="auth-input"
                    type="text"
                    placeholder={t("dashboard.subscription.buildingLabel")}
                    value={editBuilding}
                    onChange={(e) => setEditBuilding(e.target.value)}
                  />
                  <label className="auth-label" htmlFor="subscription-edit-phone">{t("dashboard.subscription.phoneLabel")}</label>
                  <input
                    id="subscription-edit-phone"
                    className="auth-input"
                    type="tel"
                    placeholder={t("dashboard.subscription.phoneLabel")}
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    <motion.button
                      className="dash-button"
                      type="submit"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      disabled={isSavingEdit}
                      style={{ flex: 1 }}
                    >
                      {isSavingEdit ? <Loader2 size={16} className="btn-spinner" /> : t("common.save")}
                    </motion.button>
                    <motion.button
                      className="dash-button-outline"
                      type="button"
                      onClick={handleCancelEditing}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      style={{ flex: 1, marginTop: 0 }}
                    >
                      {t("common.cancel")}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : hasSubscription ? (
        <p>{t("common.loading")}</p>
      ) : (
        <>
          <p>{t("dashboard.subscription.noSubscriptionYet")}</p>
          <Link className="dash-button" to="/subscribe" style={{ display: "block", textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
            {t("dashboard.noSubscription.subscribeNow")}
          </Link>
        </>
      )}
    </motion.div>
  );
}

export default SubscriptionPage;
