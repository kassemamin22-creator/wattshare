import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Zap, Receipt, ShieldCheck, UserPlus, DollarSign, LogOut, Settings } from "lucide-react";
import api from "../../services/api";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  subscription_status?: string | null;
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

export interface Revenue {
  total_collected: number;
  total_outstanding: number;
  paid_count: number;
  outstanding_count: number;
}

export interface AdminDashboardContext {
  currentUserId: string;
  users: User[];
  setUsers: Dispatch<SetStateAction<User[]>>;
  fetchUsers: () => void;
  subscriptions: Subscription[];
  setSubscriptions: Dispatch<SetStateAction<Subscription[]>>;
  fetchSubscriptions: () => void;
  bills: Bill[];
  setBills: Dispatch<SetStateAction<Bill[]>>;
  revenue: Revenue | null;
  fetchRevenue: () => void;
  tariffPrice: number | null;
  setTariffPrice: Dispatch<SetStateAction<number | null>>;
}

const NAV_ITEMS = [
  { path: "users", label: "Users", icon: Users },
  { path: "subscriptions", label: "Subscriptions", icon: Zap },
  { path: "bills", label: "Bills", icon: Receipt },
  { path: "add-manager", label: "Add Manager", icon: UserPlus },
  { path: "add-subscriber", label: "Add Subscriber", icon: UserPlus },
  { path: "pricing", label: "Pricing", icon: DollarSign },
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

const ACCOUNT_SETTINGS_PATH = "/admin/account-settings";

function AdminDashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUserId, setCurrentUserId] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [revenue, setRevenue] = useState<Revenue | null>(null);
  const [tariffPrice, setTariffPrice] = useState<number | null>(null);

  const fetchUsers = () => {
    api.get("/admin/users").then((response) => setUsers(response.data));
  };

  const fetchSubscriptions = () => {
    api.get("/admin/subscriptions").then((response) => setSubscriptions(response.data));
  };

  const fetchRevenue = () => {
    api.get("/admin/revenue").then((response) => setRevenue(response.data));
  };

  useEffect(() => {
    api.get("/me").then((response) => setCurrentUserId(response.data.id));
    fetchUsers();
    fetchSubscriptions();
    fetchRevenue();
    api.get("/admin/bills").then((response) => setBills(response.data));
    api.get("/tariff").then((response) => {
      setTariffPrice(response.data.price_per_ampere);
    });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const context: AdminDashboardContext = {
    currentUserId,
    users,
    setUsers,
    fetchUsers,
    subscriptions,
    setSubscriptions,
    fetchSubscriptions,
    bills,
    setBills,
    revenue,
    fetchRevenue,
    tariffPrice,
    setTariffPrice,
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
            const fullPath = `/admin/${item.path}`;
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
        <div className="dash-page-title">
          <ShieldCheck size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> Admin Dashboard
        </div>

        <Outlet context={context} />
      </main>
    </div>
  );
}

export default AdminDashboardLayout;
