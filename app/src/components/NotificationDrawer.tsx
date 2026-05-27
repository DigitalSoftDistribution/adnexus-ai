// @ts-nocheck
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Bell,
  AlertTriangle,
  FileText,
  Bot,
  Settings,
  Check,
  Circle,
  ArrowRight,
  CheckCheck,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────
type NotificationType = "alert" | "draft" | "ai" | "system";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  link: string;
}

type TabKey = "all" | NotificationType;

// ─── Mock Data ───────────────────────────────────────────────────────
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    type: "alert",
    title: "Pipeline Failure Detected",
    description: "The production deployment pipeline failed at the 'Run Tests' stage. Review the logs for details.",
    timestamp: "2 min ago",
    read: false,
    link: "/pipelines/prod-01",
  },
  {
    id: "n2",
    type: "ai",
    title: "AI Suggested Code Refactor",
    description: "The assistant found 3 opportunities to optimize the auth middleware for better performance.",
    timestamp: "15 min ago",
    read: false,
    link: "/ai-actions/refactor-12",
  },
  {
    id: "n3",
    type: "system",
    title: "Scheduled Maintenance",
    description: "System maintenance is planned for tonight at 02:00 UTC. Services may be briefly unavailable.",
    timestamp: "32 min ago",
    read: false,
    link: "/system/maintenance",
  },
  {
    id: "n4",
    type: "draft",
    title: "API Documentation Draft",
    description: "Your draft 'v2 Endpoints Overview' is ready for review. 4 sections need completion.",
    timestamp: "1 hr ago",
    read: false,
    link: "/drafts/doc-45",
  },
  {
    id: "n5",
    type: "alert",
    title: "High Memory Usage Warning",
    description: "Server cluster-02 is running at 94% memory capacity. Consider scaling up or restarting services.",
    timestamp: "1 hr ago",
    read: true,
    link: "/monitoring/cluster-02",
  },
  {
    id: "n6",
    type: "ai",
    title: "Test Cases Generated",
    description: "AI has generated 12 new test cases for the payment module based on recent changes.",
    timestamp: "2 hr ago",
    read: true,
    link: "/ai-actions/tests-88",
  },
  {
    id: "n7",
    type: "system",
    title: "New Team Member Joined",
    description: "Sarah Chen has been added to the Engineering team with Developer permissions.",
    timestamp: "3 hr ago",
    read: true,
    link: "/team/members",
  },
  {
    id: "n8",
    type: "draft",
    title: "Release Notes Draft",
    description: "Auto-generated release notes for v3.4.0 are ready. 8 PRs included, 2 need descriptions.",
    timestamp: "3 hr ago",
    read: false,
    link: "/drafts/release-340",
  },
  {
    id: "n9",
    type: "alert",
    title: "SSL Certificate Expiring Soon",
    description: "The SSL certificate for api.example.com expires in 7 days. Renew to avoid service disruption.",
    timestamp: "5 hr ago",
    read: true,
    link: "/security/certificates",
  },
  {
    id: "n10",
    type: "ai",
    title: "Security Vulnerability Scan Complete",
    description: "Scan found 1 medium-severity issue in the dependency 'lodash@4.17.20'. Update recommended.",
    timestamp: "6 hr ago",
    read: false,
    link: "/ai-actions/security-15",
  },
  {
    id: "n11",
    type: "system",
    title: "Backup Completed",
    description: "Daily backup completed successfully. 2.4 GB archived to cold storage. Retention: 30 days.",
    timestamp: "8 hr ago",
    read: true,
    link: "/system/backups",
  },
  {
    id: "n12",
    type: "draft",
    title: "Onboarding Guide Draft",
    description: "The new onboarding guide draft has 3 pending sections: Access, Tools, and First Week.",
    timestamp: "10 hr ago",
    read: true,
    link: "/drafts/onboarding-01",
  },
  {
    id: "n13",
    type: "alert",
    title: "Database Slow Query Detected",
    description: "Query execution time exceeded 3s threshold on the users table. Index optimization suggested.",
    timestamp: "12 hr ago",
    read: true,
    link: "/monitoring/queries",
  },
  {
    id: "n14",
    type: "ai",
    title: "Meeting Summary Ready",
    description: "The weekly standup summary has been generated with 5 action items assigned to team members.",
    timestamp: "Yesterday",
    read: true,
    link: "/ai-actions/summary-42",
  },
  {
    id: "n15",
    type: "system",
    title: "Policy Update",
    description: "The data retention policy has been updated. Review the changes before they take effect on Jan 1.",
    timestamp: "Yesterday",
    read: false,
    link: "/system/policies",
  },
];

// ─── Tab Configuration ───────────────────────────────────────────────
const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "alert", label: "Alerts" },
  { key: "draft", label: "Drafts" },
  { key: "ai", label: "AI Actions" },
  { key: "system", label: "System" },
];

// ─── Type Config ─────────────────────────────────────────────────────
const TYPE_CONFIG: Record<
  NotificationType,
  { icon: React.ElementType; color: string; bg: string }
> = {
  alert: {
    icon: AlertTriangle,
    color: "text-rose-400",
    bg: "bg-rose-400/10",
  },
  draft: {
    icon: FileText,
    color: "text-sky-400",
    bg: "bg-sky-400/10",
  },
  ai: {
    icon: Bot,
    color: "text-violet-400",
    bg: "bg-violet-400/10",
  },
  system: {
    icon: Settings,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
};

// ─── Props ───────────────────────────────────────────────────────────
interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Component ───────────────────────────────────────────────────────
export default function NotificationDrawer({
  isOpen,
  onClose,
}: NotificationDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [notifications, setNotifications] =
    useState<Notification[]>(MOCK_NOTIFICATIONS);

  const filteredNotifications = useMemo(() => {
    if (activeTab === "all") return notifications;
    return notifications.filter((n) => n.type === activeTab);
  }, [activeTab, notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkRead = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleItemClick = (link: string) => {
    // In a real app, use your router's navigate function
    window.location.href = link;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 z-50 flex h-full w-[400px] flex-col bg-[#0f1117] border-l border-white/5 shadow-2xl"
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-zinc-300" />
                  <h2 className="text-base font-semibold text-zinc-100">
                    Notifications
                  </h2>
                </div>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors cursor-pointer"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark All Read
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="flex items-center justify-center w-8 h-8 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex items-center gap-0.5 px-3 py-2 border-b border-white/5">
              {TABS.map((tab) => {
                const tabCount =
                  tab.key === "all"
                    ? notifications.length
                    : notifications.filter((n) => n.type === tab.key).length;
                const isActive = activeTab === tab.key;

                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      isActive
                        ? "text-zinc-100 bg-white/8"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-white/4"
                    }`}
                  >
                    {tab.label}
                    <span
                      className={`text-[10px] font-semibold ${
                        isActive ? "text-zinc-400" : "text-zinc-600"
                      }`}
                    >
                      {tabCount}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-2 right-2 h-[2px] bg-sky-400 rounded-full"
                        transition={{
                          type: "spring",
                          damping: 25,
                          stiffness: 300,
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* ── Notification List ── */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {filteredNotifications.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col items-center justify-center h-full gap-3 text-zinc-500"
                  >
                    <Bell className="w-10 h-10 text-zinc-600" />
                    <p className="text-sm">No notifications</p>
                  </motion.div>
                ) : (
                  filteredNotifications.map((notification, index) => {
                    const config = TYPE_CONFIG[notification.type];
                    const Icon = config.icon;
                    const isUnread = !notification.read;

                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.03, duration: 0.2 }}
                        onClick={() => handleItemClick(notification.link)}
                        className={`group relative flex items-start gap-3 px-5 py-3.5 cursor-pointer border-b border-white/3 transition-colors hover:bg-white/[0.03] ${
                          isUnread
                            ? "border-l-2 border-l-sky-400 bg-sky-400/[0.02]"
                            : "border-l-2 border-l-transparent"
                        }`}
                      >
                        {/* Icon */}
                        <div
                          className={`flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg ${config.bg}`}
                        >
                          <Icon className={`w-4.5 h-4.5 ${config.color}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3
                              className={`text-sm leading-tight ${
                                isUnread
                                  ? "font-semibold text-zinc-100"
                                  : "font-medium text-zinc-300"
                              }`}
                            >
                              {notification.title}
                            </h3>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-zinc-500 line-clamp-2">
                            {notification.description}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[11px] text-zinc-600">
                              {notification.timestamp}
                            </span>
                            <span
                              className={`text-[10px] font-medium uppercase tracking-wider ${config.color}`}
                            >
                              {notification.type === "ai"
                                ? "AI"
                                : notification.type}
                            </span>
                          </div>
                        </div>

                        {/* Mark Read Dot */}
                        {isUnread && (
                          <button
                            onClick={(e) =>
                              handleMarkRead(e, notification.id)
                            }
                            className="flex-shrink-0 mt-1 w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                            title="Mark as read"
                          >
                            <Circle className="w-2.5 h-2.5 fill-sky-400 text-sky-400" />
                          </button>
                        )}
                        {notification.read && (
                          <div className="flex-shrink-0 mt-1 w-5 h-5 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 text-zinc-600" />
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>

            {/* ── Footer ── */}
            <div className="flex items-center justify-center px-5 py-3.5 border-t border-white/5 bg-[#0f1117]">
              <a
                href="/inbox"
                className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-sky-400 transition-colors"
              >
                View All Notifications
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
