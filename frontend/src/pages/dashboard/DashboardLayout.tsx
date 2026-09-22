import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, BarChart3, Sparkles, Receipt, MessageCircle, LogOut, Settings } from "lucide-react";
import { isAxiosError } from "axios";
import api from "../../services/api";

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
  unit_number: string;
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
}

const NAV_ITEMS = [
  { path: "chart", label: "Consumption Chart", icon: BarChart3 },
  { path: "subscription", label: "Subscription", icon: Zap },
  { path: "forecast", label: "AI Forecast", icon: Sparkles },
  { path: "billing", label: "Billing History", icon: Receipt },
  { path: "report-issue", label: "Report Issue", icon: MessageCircle },
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
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [hasSubscription, setHasSubscription] = useState(true);
  const [bills, setBills] = useState<Bill[]>([]);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");

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
      setProfileEmail(response.data.email);
    });

    fetchSubscription();

    api.get("/bills/me").then((response) => setBills(response.data));

    api.get("/bills/predict").then((response) => setPrediction(response.data));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const displayName = currentUser
    ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)
    : "";
  const avatarInitial = currentUser ? currentUser.role.charAt(0).toUpperCase() : "";

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
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <span className="admin-sidebar-logo-bolt">⚡</span> WattShare
        </div>
        <motion.nav
          className="admin-nav"
          variants={navContainerVariants}
          initial="hidden"
          animate="visible"
        >
          {NAV_ITEMS.map((item) => {
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
              >
                {isActive && (
                  <motion.span
                    layoutId="admin-nav-active-pill"
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
                <span className="admin-nav-label">{item.label}</span>
              </MotionLink>
            );
          })}
        </motion.nav>

        <div>
          <hr className="dash-divider" />
          <MotionLink
            to={ACCOUNT_SETTINGS_PATH}
            className={
              location.pathname === ACCOUNT_SETTINGS_PATH
                ? "admin-nav-link is-active"
                : "admin-nav-link"
            }
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            {location.pathname === ACCOUNT_SETTINGS_PATH && (
              <motion.span
                layoutId="admin-nav-active-pill"
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
            <span className="admin-nav-label">Account Settings</span>
          </MotionLink>
          <motion.button
            className="dash-button-logout"
            onClick={handleLogout}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <LogOut size={18} /> Log Out
          </motion.button>
        </div>
      </aside>

      <div className="admin-mobile-bar">
        <div className="admin-sidebar-logo admin-mobile-logo">⚡ WattShare</div>
        <motion.button
          className="admin-mobile-logout"
          onClick={handleLogout}
          whileTap={{ scale: 0.97 }}
        >
          <LogOut size={16} /> Log Out
        </motion.button>
      </div>

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
              You don't have an active subscription yet
            </p>
            <p className="forecast-message" style={{ margin: 0 }}>
              Subscribe to a generator to start tracking your usage and bills.
            </p>
            <Link
              className="dash-button"
              to="/subscribe"
              style={{ textDecoration: "none", boxSizing: "border-box", marginTop: "0.5rem" }}
            >
              Subscribe Now
            </Link>
          </div>
        ) : (
          <>
            <div className="dash-header">
              <div className="dash-greeting">
                <p className="dash-greeting-text">Hello, {displayName}</p>
                {subscription && (
                  <span className="pill pill-success pill-live">
                    {subscription.ampere}A ACTIVE
                  </span>
                )}
              </div>
              <div className="dash-avatar">{avatarInitial}</div>
            </div>

            <Outlet context={context} />
          </>
        )}
      </main>
    </div>
  );
}

export default DashboardLayout;
