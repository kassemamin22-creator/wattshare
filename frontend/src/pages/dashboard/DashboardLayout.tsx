// Layout for the subscriber dashboard: sidebar and mobile menu, greeting header, shared data loading,
// and the chatbot widget. The subscriber pages render inside it.
import { useEffect, useRef, useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, BarChart3, Sparkles, Receipt, MessageCircle, LogOut, Settings, Menu, X, Send, Loader2 } from "lucide-react";
import { isAxiosError } from "axios";
import api from "../../services/api";
import { useToast } from "../../hooks/useToast";
import { useTranslation } from "react-i18next";

interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export interface CurrentUser {
  id: string;
  role: string;
}

export interface Subscription {
  id: string;
  subscriber_id: string;
  generator_name: string;
  ampere: number;
  tariff_rate: number;
  status: string;
  address: string;
  building: string;
  phone: string;
  pending_ampere_change?: number | null;
}

export interface Bill {
  id: string;
  subscriber_id: string;
  meter_reading_id: string;
  consumption_kwh: number;
  amount: number;
  status: string;
  created_at: string;
  due_date: string;
}

export interface Prediction {
  prediction: number | null;
  message: string;
}

export interface DashboardContext {
  currentUser: CurrentUser | null;
  displayName: string;
  avatarInitial: string;
  subscription: Subscription | null;
  setSubscription: Dispatch<SetStateAction<Subscription | null>>;
  hasSubscription: boolean;
  fetchSubscription: () => Promise<void>;
  bills: Bill[];
  prediction: Prediction | null;
  profileName: string;
  setProfileName: Dispatch<SetStateAction<string>>;
  profileEmail: string;
  setProfileEmail: Dispatch<SetStateAction<string>>;
  profilePhone: string;
  setProfilePhone: Dispatch<SetStateAction<string>>;
}

const NAV_ITEMS = [
  { path: "chart", labelKey: "chart", icon: BarChart3 },
  { path: "subscription", labelKey: "subscription", icon: Zap },
  { path: "forecast", labelKey: "forecast", icon: Sparkles },
  { path: "billing", labelKey: "billing", icon: Receipt },
  { path: "report-issue", labelKey: "reportIssue", icon: MessageCircle },
];

const navContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } },
};

const navItemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

const MotionLink = motion(Link);

const ACCOUNT_SETTINGS_PATH = "/dashboard/account-settings";

function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const showToast = useToast();
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [hasSubscription, setHasSubscription] = useState(true);
  const [bills, setBills] = useState<Bill[]>([]);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = chatMessagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isSending, isChatOpen]);

  const handleSendMessage = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = currentInput.trim();
    if (!text || isSending) return;

    const history = messages.map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, { role: "user", text }]);
    setCurrentInput("");
    setIsSending(true);

    try {
      const response = await api.post("/chatbot/ask", { message: text, history });
      setMessages((prev) => [...prev, { role: "model", text: response.data.reply }]);
    } catch (err) {
      const detail = isAxiosError(err) ? err.response?.data?.detail : undefined;
      showToast(typeof detail === "string" ? detail : t("dashboard.chatbot.failedToReach"), "error");
      setMessages((prev) => [
        ...prev,
        { role: "model", text: t("dashboard.chatbot.errorBubble") },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const fetchSubscription = () => {
    return api
      .get("/subscription/me")
      .then((response) => setSubscription(response.data))
      .catch((err) => {
        if (isAxiosError(err) && err.response?.status === 404) {
          setHasSubscription(false);
        }
      });
  };

  useEffect(() => {
    api.get("/me").then((response) => setCurrentUser(response.data));

    api.get("/users/me").then((response) => {
      setProfileName(response.data.name);
      setProfileEmail(response.data.email ?? "");
      setProfilePhone(response.data.phone ?? "");
    });

    fetchSubscription();

    api.get("/bills/me").then((response) => setBills(response.data));

    api.get("/bills/predict").then((response) => setPrediction(response.data));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const renderNavLinks = (pillLayoutId: string, onNavigate?: () => void): ReactNode =>
    NAV_ITEMS.map((item) => {
      const Icon = item.icon;
      const fullPath = `/dashboard/${item.path}`;
      const isActive = location.pathname === fullPath;
      return (
        <MotionLink
          key={item.path}
          to={fullPath}
          className={isActive ? "admin-nav-link is-active" : "admin-nav-link"}
          variants={navItemVariants}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onNavigate}
        >
          {isActive && (
            <motion.span
              layoutId={pillLayoutId}
              className="admin-nav-pill"
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
            />
          )}
          <motion.span
            className="admin-nav-icon"
            whileHover={{ rotate: -10, scale: 1.15 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <Icon size={18} />
          </motion.span>
          <span className="admin-nav-label">{t(`nav.${item.labelKey}`)}</span>
        </MotionLink>
      );
    });

  const renderAccountSettingsLink = (pillLayoutId: string, onNavigate?: () => void): ReactNode => {
    const isActive = location.pathname === ACCOUNT_SETTINGS_PATH;
    return (
      <MotionLink
        to={ACCOUNT_SETTINGS_PATH}
        className={isActive ? "admin-nav-link is-active" : "admin-nav-link"}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onNavigate}
      >
        {isActive && (
          <motion.span
            layoutId={pillLayoutId}
            className="admin-nav-pill"
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          />
        )}
        <motion.span
          className="admin-nav-icon"
          whileHover={{ rotate: -10, scale: 1.15 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
        >
          <Settings size={18} />
        </motion.span>
        <span className="admin-nav-label">{t("nav.accountSettings")}</span>
      </MotionLink>
    );
  };

  const displayName = currentUser
    ? t(`common.roles.${currentUser.role}`, {
        defaultValue: currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1),
      })
    : "";
  const avatarInitial = displayName.charAt(0).toUpperCase();

  const context: DashboardContext = {
    currentUser,
    displayName,
    avatarInitial,
    subscription,
    setSubscription,
    hasSubscription,
    fetchSubscription,
    bills,
    prediction,
    profileName,
    setProfileName,
    profileEmail,
    setProfileEmail,
    profilePhone,
    setProfilePhone,
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <span className="admin-sidebar-logo-bolt">⚡</span> WattShare
        </div>
        {hasSubscription && (
          <>
            <motion.nav
              className="admin-nav"
              variants={navContainerVariants}
              initial="hidden"
              animate="visible"
            >
              {renderNavLinks("admin-nav-active-pill")}
            </motion.nav>

            <div>
              <hr className="dash-divider" />
              {renderAccountSettingsLink("admin-nav-active-pill")}
            </div>
          </>
        )}
        <motion.button
          className="dash-button-logout"
          onClick={handleLogout}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <LogOut size={18} /> {t("common.logout")}
        </motion.button>
      </aside>

      <div className="admin-mobile-bar">
        {hasSubscription && (
          <motion.button
            className="admin-mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            whileTap={{ scale: 0.94 }}
            aria-label={isMobileMenuOpen ? t("dashboard.menuClose") : t("dashboard.menuOpen")}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </motion.button>
        )}
        <div className="admin-sidebar-logo admin-mobile-logo">⚡ WattShare</div>
        <motion.button
          className="admin-mobile-logout"
          onClick={handleLogout}
          whileTap={{ scale: 0.97 }}
        >
          <LogOut size={16} /> {t("common.logout")}
        </motion.button>
      </div>

      {hasSubscription && (
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                className="mobile-nav-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={closeMobileMenu}
              />
              <motion.div
                className="mobile-nav-drawer"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <div className="mobile-nav-drawer-header">
                  <div className="admin-sidebar-logo" style={{ margin: 0 }}>
                    <span className="admin-sidebar-logo-bolt">⚡</span> WattShare
                  </div>
                  <motion.button
                    className="admin-mobile-menu-toggle"
                    onClick={closeMobileMenu}
                    whileTap={{ scale: 0.94 }}
                    aria-label={t("dashboard.menuClose")}
                  >
                    <X size={20} />
                  </motion.button>
                </div>
                <nav className="admin-nav">
                  {renderNavLinks("mobile-nav-active-pill", closeMobileMenu)}
                </nav>
                <div>
                  <hr className="dash-divider" />
                  {renderAccountSettingsLink("mobile-nav-active-pill", closeMobileMenu)}
                  <motion.button
                    className="dash-button-logout"
                    onClick={handleLogout}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <LogOut size={18} /> {t("common.logout")}
                  </motion.button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}

      <main className="admin-main">
        {!hasSubscription ? (
          <div
            style={{
              minHeight: "70vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              gap: "1rem",
            }}
          >
            <Zap size={40} className="dash-icon" style={{ color: "var(--color-accent)" }} />
            <p className="dash-card-title" style={{ margin: 0 }}>
              {t("dashboard.noSubscription.title")}
            </p>
            <p className="forecast-message" style={{ margin: 0 }}>
              {t("dashboard.noSubscription.subtitle")}
            </p>
            <Link
              className="dash-button"
              to="/subscribe"
              style={{ textDecoration: "none", boxSizing: "border-box", marginTop: "0.5rem" }}
            >
              {t("dashboard.noSubscription.subscribeNow")}
            </Link>
          </div>
        ) : (
          <>
            <div className="dash-header">
              <div className="dash-greeting">
                <p className="dash-greeting-text">{t("dashboard.greeting", { name: displayName })}</p>
                {subscription && (
                  <span className="pill pill-success pill-live">
                    {t("dashboard.activeStatus", { ampere: subscription.ampere })}
                  </span>
                )}
              </div>
              <div className="dash-avatar">{avatarInitial}</div>
            </div>

            <Outlet context={context} />
          </>
        )}
      </main>

      {hasSubscription && (
        <>
          <AnimatePresence>
            {isChatOpen && (
              <motion.div
                className="dash-card chat-panel"
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.97 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <div className="chat-panel-header">
                  <span>{t("dashboard.chatbot.title")}</span>
                  <button
                    type="button"
                    className="chat-panel-close"
                    onClick={() => setIsChatOpen(false)}
                    aria-label={t("dashboard.chatbot.closeChat")}
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="chat-messages" ref={chatMessagesRef}>
                  {messages.length === 0 && !isSending && (
                    <p className="chat-empty">{t("dashboard.chatbot.emptyState")}</p>
                  )}
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={
                        message.role === "user"
                          ? "chat-bubble chat-bubble-user"
                          : "chat-bubble chat-bubble-model"
                      }
                    >
                      {message.text}
                    </div>
                  ))}
                  {isSending && (
                    <div className="chat-bubble chat-bubble-model">
                      <Loader2 size={14} className="btn-spinner" /> {t("dashboard.chatbot.typing")}
                    </div>
                  )}
                </div>
                <form className="chat-input-row" onSubmit={handleSendMessage}>
                  <input
                    className="auth-input"
                    type="text"
                    placeholder={t("dashboard.chatbot.placeholder")}
                    aria-label={t("dashboard.chatbot.placeholder")}
                    maxLength={1000}
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="chat-send"
                    disabled={isSending || !currentInput.trim()}
                    aria-label={t("dashboard.chatbot.sendMessage")}
                  >
                    <Send size={16} />
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
          <motion.button
            type="button"
            className="chat-fab"
            onClick={() => setIsChatOpen((prev) => !prev)}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            aria-label={isChatOpen ? t("dashboard.chatbot.closeChat") : t("dashboard.chatbot.openChat")}
          >
            <MessageCircle size={24} />
          </motion.button>
        </>
      )}
    </div>
  );
}

export default DashboardLayout;
