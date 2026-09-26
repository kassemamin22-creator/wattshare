// Public landing page: hero, feature highlights, how-it-works steps, and sign-up / log-in buttons.
import {
  useState,
  useEffect,
  useRef,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  motion,
  useMotionValue,
  useSpring,
  useScroll,
  useTransform,
  animate,
} from "framer-motion";
import {
  Zap,
  TrendingUp,
  Gauge,
  MessageSquare,
  LayoutDashboard,
  ShieldCheck,
  UserPlus,
  Activity,
  CreditCard,
  type LucideIcon,
} from "lucide-react";
import LanguageSwitcher from "../components/LanguageSwitcher";

const PARALLAX_RANGE = 18;

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

const STATS = [
  { target: 500, decimals: 0, suffix: "+", labelKey: "landing.stats.subscribersManaged" },
  { target: 99.9, decimals: 1, suffix: "%", labelKey: "landing.stats.uptime" },
  { target: 24, decimals: 0, suffix: "/7", labelKey: "landing.stats.liveMonitoring" },
];

const CHART_BARS = [40, 65, 45, 80, 55, 90, 60, 50, 72, 85];

const TICKER_KEYS = ["billing", "predictions", "security", "mobile", "setup"];

const FEATURE_ICONS: Record<string, LucideIcon> = {
  billing: Zap,
  prediction: TrendingUp,
  tracking: Gauge,
  issues: MessageSquare,
  dashboards: LayoutDashboard,
  auth: ShieldCheck,
};

const STEP_ICONS: Record<string, LucideIcon> = {
  subscribe: UserPlus,
  metered: Activity,
  pay: CreditCard,
};

const TRUST_ITEMS = [
  { type: "stat" as const, value: "50+", labelKey: "landing.trust.buildingsLabel" },
  {
    type: "quote" as const,
    quoteKey: "landing.trust.quote1",
    authorKey: "landing.trust.quote1Author",
  },
  {
    type: "quote" as const,
    quoteKey: "landing.trust.quote2",
    authorKey: "landing.trust.quote2Author",
  },
  { type: "stat" as const, value: "10k+", labelKey: "landing.trust.billsLabel" },
];

interface TranslatedItem {
  id: string;
  title: string;
  description: string;
}

function toItems(value: unknown): TranslatedItem[] {
  return Array.isArray(value) ? (value as TranslatedItem[]) : [];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

interface AnimatedStatProps {
  target: number;
  decimals?: number;
  suffix?: string;
  label: string;
  delay?: number;
}

function AnimatedStat({ target, decimals = 0, suffix = "", label, delay = 0 }: AnimatedStatProps) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const controls = animate(0, target, {
      duration: 1.6,
      delay,
      ease: "easeOut",
      onUpdate: (latest) => setValue(latest),
    });
    return () => controls.stop();
  }, [target, delay]);

  return (
    <div className="landing-stat">
      <div className="landing-stat-number">
        {value.toFixed(decimals)}
        {suffix}
      </div>
      <div className="landing-stat-label">{label}</div>
    </div>
  );
}

interface MagneticWrapProps {
  children: ReactNode;
  className?: string;
  strength?: number;
  maxOffset?: number;
  onHoverChange?: (hovering: boolean) => void;
}

function MagneticWrap({
  children,
  className,
  strength = 0.3,
  maxOffset = 10,
  onHoverChange,
}: MagneticWrapProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 200, damping: 15, mass: 0.3 });
  const springY = useSpring(y, { stiffness: 200, damping: 15, mass: 0.3 });

  const handleMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - (rect.left + rect.width / 2);
    const relY = e.clientY - (rect.top + rect.height / 2);
    x.set(clamp(relX * strength, -maxOffset, maxOffset));
    y.set(clamp(relY * strength, -maxOffset, maxOffset));
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    onHoverChange?.(false);
  };

  return (
    <motion.div
      className={className ? `landing-magnetic ${className}` : "landing-magnetic"}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </motion.div>
  );
}

function SectionDivider({
  bg,
  fill,
  flip = false,
}: {
  bg: string;
  fill: string;
  flip?: boolean;
}) {
  return (
    <div className="landing-divider" style={{ backgroundColor: bg }} aria-hidden="true">
      <svg viewBox="0 0 1200 80" preserveAspectRatio="none">
        <path
          d={
            flip
              ? "M0,40 Q300,70 600,40 T1200,40 L1200,80 L0,80 Z"
              : "M0,40 Q300,10 600,40 T1200,40 L1200,80 L0,80 Z"
          }
          style={{ fill }}
        />
      </svg>
    </div>
  );
}

function Landing() {
  const { t } = useTranslation();
  const featureItems = toItems(t("landing.features.items", { returnObjects: true }));
  const stepItems = toItems(t("landing.steps.items", { returnObjects: true }));

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const particlesX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const particlesY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const cursorSpringX = useSpring(cursorX, { stiffness: 150, damping: 15, mass: 0.1 });
  const cursorSpringY = useSpring(cursorY, { stiffness: 150, damping: 15, mass: 0.1 });
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorHover, setCursorHover] = useState(false);

  const { scrollYProgress } = useScroll();
  const scrollProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const previewRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: previewProgress } = useScroll({
    target: previewRef,
    offset: ["start end", "end start"],
  });
  const previewRotateX = useTransform(previewProgress, [0, 0.5, 1], [12, 0, -12]);
  const previewOpacity = useTransform(
    previewProgress,
    [0, 0.2, 0.5, 0.8, 1],
    [0.3, 1, 1, 1, 0.3]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const relX = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
      const relY = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
      mouseX.set(relX * PARALLAX_RANGE);
      mouseY.set(relY * PARALLAX_RANGE);
      cursorX.set(e.clientX - 10);
      cursorY.set(e.clientY - 10);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY, cursorX, cursorY]);

  const handleCardMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
    card.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
  };

  return (
    <div className="landing-page">
      <motion.div className="landing-scroll-progress" style={{ scaleX: scrollProgress }} />
      <motion.div
        className="landing-cursor"
        style={{ x: cursorSpringX, y: cursorSpringY }}
        animate={{ scale: cursorHover ? 1.8 : 1, opacity: cursorVisible ? 1 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        aria-hidden="true"
      />

      <section
        className="landing-hero landing-cursor-zone"
        onMouseEnter={() => setCursorVisible(true)}
        onMouseLeave={() => setCursorVisible(false)}
      >
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
          className="auth-particles"
          aria-hidden="true"
          style={{ x: particlesX, y: particlesY }}
        >
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
        </motion.div>
        <div className="landing-hero-content">
          <motion.div
            className="auth-logo-wrap"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="auth-logo-glow"></div>
            <div className="auth-logo">{t("landing.brand")}</div>
          </motion.div>
          <motion.h1
            className="landing-headline"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
          >
            {t("landing.hero.headline")}
          </motion.h1>
          <motion.p
            className="landing-subtitle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          >
            {t("landing.hero.description")}
          </motion.p>
          <motion.div
            className="landing-cta-group"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45, ease: "easeOut" }}
          >
            <MagneticWrap onHoverChange={setCursorHover}>
              <div className="auth-button-ring landing-cta-ring">
                <Link to="/register" className="auth-button landing-cta-link">
                  {t("landing.hero.getStarted")}
                </Link>
              </div>
            </MagneticWrap>
            <MagneticWrap onHoverChange={setCursorHover}>
              <Link to="/login" className="landing-btn-secondary">
                {t("landing.hero.login")}
              </Link>
            </MagneticWrap>
          </motion.div>
          <motion.div
            className="landing-stats-row"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
          >
            {STATS.map((stat, index) => (
              <AnimatedStat
                key={stat.labelKey}
                target={stat.target}
                decimals={stat.decimals}
                suffix={stat.suffix}
                label={t(stat.labelKey)}
                delay={0.8 + index * 0.15}
              />
            ))}
          </motion.div>
        </div>
      </section>

      <section className="landing-section landing-preview-section">
        <div className="landing-container">
          <h2 className="landing-section-title">{t("landing.preview.sectionTitle")}</h2>
          <p className="landing-section-subtitle">
            {t("landing.preview.sectionSubtitle")}
          </p>
          <div className="landing-preview-wrap" ref={previewRef}>
            <motion.div
              className="landing-preview-card"
              style={{ rotateX: previewRotateX, opacity: previewOpacity }}
            >
              <div className="landing-preview-titlebar">
                <span className="landing-preview-dot landing-preview-dot-red"></span>
                <span className="landing-preview-dot landing-preview-dot-yellow"></span>
                <span className="landing-preview-dot landing-preview-dot-green"></span>
                <span className="landing-preview-url">app.wattshare.io/dashboard</span>
              </div>
              <div className="landing-preview-body">
                <div className="landing-preview-stats">
                  <div className="landing-preview-stat">
                    <div className="landing-preview-stat-label">{t("landing.preview.billLabel")}</div>
                    <div className="landing-preview-stat-value">$42.50</div>
                  </div>
                  <div className="landing-preview-stat">
                    <div className="landing-preview-stat-label">{t("landing.preview.usageLabel")}</div>
                    <div className="landing-preview-stat-value">18.2A</div>
                  </div>
                  <div className="landing-preview-stat">
                    <div className="landing-preview-stat-label">{t("landing.preview.statusLabel")}</div>
                    <div className="landing-preview-stat-value landing-preview-stat-active">
                      {t("landing.preview.statusActive")}
                    </div>
                  </div>
                </div>
                <svg
                  className="landing-preview-chart"
                  viewBox="0 0 300 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  {CHART_BARS.map((h, index) => (
                    <motion.rect
                      key={index}
                      x={index * 30 + 5}
                      y={100 - h}
                      width={20}
                      height={h}
                      rx={3}
                      className="landing-preview-bar"
                      initial={{ scaleY: 0 }}
                      whileInView={{ scaleY: 1 }}
                      viewport={{ once: true, amount: 0.6 }}
                      transition={{ duration: 0.5, delay: index * 0.06, ease: "easeOut" }}
                      style={{ transformOrigin: "bottom" }}
                    />
                  ))}
                </svg>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <div className="landing-marquee" aria-hidden="true">
        <div className="landing-marquee-track">
          {[...TICKER_KEYS, ...TICKER_KEYS].map((key, index) => (
            <span key={index} className="landing-marquee-item">
              {t(`landing.ticker.${key}`)}
            </span>
          ))}
        </div>
      </div>

      <section
        className="landing-section landing-cursor-zone"
        onMouseEnter={() => setCursorVisible(true)}
        onMouseLeave={() => setCursorVisible(false)}
      >
        <div className="landing-container">
          <h2 className="landing-section-title">
            {t("landing.features.sectionTitle")}
          </h2>
          <p className="landing-section-subtitle">
            {t("landing.features.sectionSubtitle")}
          </p>
          <div className="landing-features-grid">
            {featureItems.map((feature, index) => {
              const Icon = FEATURE_ICONS[feature.id] ?? Zap;
              return (
                <motion.div
                  key={feature.id}
                  className="landing-feature-card"
                  onMouseMove={handleCardMouseMove}
                  onMouseEnter={() => setCursorHover(true)}
                  onMouseLeave={() => setCursorHover(false)}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.5, delay: (index % 3) * 0.1, ease: "easeOut" }}
                >
                  <div className="landing-feature-icon">
                    <Icon size={22} />
                  </div>
                  <div className="landing-feature-title">{feature.title}</div>
                  <div className="landing-feature-desc">{feature.description}</div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <SectionDivider bg="var(--color-bg)" fill="var(--color-surface)" />

      <section className="landing-section landing-section-alt">
        <div className="landing-container">
          <h2 className="landing-section-title">
            {t("landing.trust.sectionTitle")}
          </h2>
          <p className="landing-section-subtitle">
            {t("landing.trust.sectionSubtitle")}
          </p>
          <div className="landing-trust-grid">
            {TRUST_ITEMS.map((item, index) => (
              <motion.div
                key={index}
                className="landing-trust-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
              >
                {item.type === "stat" ? (
                  <>
                    <div className="landing-trust-stat-value">{item.value}</div>
                    <div className="landing-trust-stat-label">{t(item.labelKey)}</div>
                  </>
                ) : (
                  <>
                    <p className="landing-trust-quote">{t(item.quoteKey)}</p>
                    <div className="landing-trust-name">{t(item.authorKey)}</div>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <SectionDivider bg="var(--color-surface)" fill="var(--color-bg)" flip />

      <section className="landing-section">
        <div className="landing-container">
          <h2 className="landing-section-title">{t("landing.steps.sectionTitle")}</h2>
          <p className="landing-section-subtitle">
            {t("landing.steps.sectionSubtitle")}
          </p>
          <div className="landing-steps-wrap">
            <svg
              className="landing-steps-line"
              viewBox="0 0 100 10"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="landing-steps-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" style={{ stopColor: "var(--color-accent)" }} />
                  <stop offset="100%" style={{ stopColor: "var(--color-cyan)" }} />
                </linearGradient>
              </defs>
              <motion.path
                d="M16.6,5 L83.3,5"
                className="landing-steps-line-path"
                stroke="url(#landing-steps-gradient)"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 1.2, ease: "easeInOut", delay: 0.3 }}
              />
            </svg>
            <div className="landing-steps">
              {stepItems.map((step, index) => {
                const Icon = STEP_ICONS[step.id] ?? Zap;
                return (
                  <motion.div
                    key={step.id}
                    className="landing-step"
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.5, delay: index * 0.15, ease: "easeOut" }}
                  >
                    <div className="landing-step-number">{String(index + 1).padStart(2, "0")}</div>
                    <div className="landing-step-icon">
                      <Icon size={24} />
                    </div>
                    <div className="landing-step-title">{step.title}</div>
                    <div className="landing-step-desc">{step.description}</div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-logo">{t("landing.brand")}</div>
        <p className="landing-footer-tagline">
          {t("landing.footer.tagline")}
        </p>
        <p className="landing-footer-copyright">
          {t("landing.footer.copyright", { year: new Date().getFullYear() })}
        </p>
      </footer>
    </div>
  );
}

export default Landing;
