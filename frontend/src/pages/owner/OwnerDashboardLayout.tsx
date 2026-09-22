import { useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Users, UserCheck, Zap, BarChart3, AlertCircle, Receipt, UserPlus, LogOut, Gauge, Menu, X } from "lucide-react";
import api from "../../services/api";

export interface Subscriber {
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
  subscriber_name?: string;
  last_reading?: number | null;
  pending_ampere_change?: number | null;
}

export interface Issue {
  id: string;
  subscriber_id: string;
  description: string;
  status: string;
  created_at: string;
  subscriber_name?: string;
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
  subscriber_name?: string;
}

export interface OwnerDashboardContext {
  subscribers: Subscriber[];
  fetchSubscribers: () => void;
  issues: Issue[];
  setIssues: Dispatch<SetStateAction<Issue[]>>;
  bills: Bill[];
  setBills: Dispatch<SetStateAction<Bill[]>>;
  pendingSubscriptions: Subscriber[];
  setPendingSubscriptions: Dispatch<SetStateAction<Subscriber[]>>;
}

const NAV_ITEMS = [
  { path: "subscribers", label: "Subscribers", icon: Users },
  { path: "pending-approvals", label: "Pending Approvals", icon: UserCheck },
  { path: "pending-ampere-changes", label: "Pending Ampere Changes", icon: Zap },
  { path: "chart", label: "Consumption Chart", icon: BarChart3 },
  { path: "issues", label: "Reported Issues", icon: AlertCircle },
  { path: "bills", label: "Bills", icon: Receipt },
  { path: "add-subscriber", label: "Add Subscriber", icon: UserPlus },
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

function OwnerDashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [pendingSubscriptions, setPendingSubscriptions] = useState<Subscriber[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const fetchSubscribers = () => {
    api.get("/subscribers").then((response) => setSubscribers(response.data));
  };

  useEffect(() => {
    fetchSubscribers();
    api.get("/issues").then((response) => setIssues(response.data));
    api.get("/admin/bills").then((response) => setBills(response.data));
    api.get("/owner/subscriptions/pending").then((response) => setPendingSubscriptions(response.data));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const renderNavLinks = (pillLayoutId: string, onNavigate?: () => void): ReactNode =>
    NAV_ITEMS.map((item) => {
      const Icon = item.icon;
      const fullPath = `/owner/${item.path}`;
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
          <span className="admin-nav-label">{item.label}</span>
        </MotionLink>
      );
    });

  const context: OwnerDashboardContext = {
    subscribers,
    fetchSubscribers,
    issues,
    setIssues,
    bills,
    setBills,
    pendingSubscriptions,
    setPendingSubscriptions,
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
          {renderNavLinks("admin-nav-active-pill")}
        </motion.nav>
        <motion.button
          className="dash-button-logout"
          onClick={handleLogout}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <LogOut size={18} /> Log Out
        </motion.button>
      </aside>

      <div className="admin-mobile-bar">
        <motion.button
          className="admin-mobile-menu-toggle"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          whileTap={{ scale: 0.94 }}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </motion.button>
        <div className="admin-sidebar-logo admin-mobile-logo">⚡ WattShare</div>
        <motion.button
          className="admin-mobile-logout"
          onClick={handleLogout}
          whileTap={{ scale: 0.97 }}
        >
          <LogOut size={16} /> Log Out
        </motion.button>
      </div>

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
                  aria-label="Close menu"
                >
                  <X size={20} />
                </motion.button>
              </div>
              <nav className="admin-nav">
                {renderNavLinks("mobile-nav-active-pill", closeMobileMenu)}
              </nav>
              <motion.button
                className="dash-button-logout"
                onClick={handleLogout}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <LogOut size={18} /> Log Out
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="admin-main">
        <div className="dash-page-title">
          <Gauge size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> Manager Dashboard
        </div>

        <Outlet context={context} />
      </main>
    </div>
  );
}

export default OwnerDashboardLayout;
