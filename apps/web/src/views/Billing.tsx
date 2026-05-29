import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useWorkspace } from "../hooks/useWorkspace";
import { api } from "../lib/api";
import {
  CreditCard,
  Zap,
  CheckCircle2,
  AlertCircle,
  Receipt,
  ArrowUpRight,
  Loader2,
  Shield,
  Palette,
  Eye,
  Sparkles,
  ChevronRight,
  Download,
  ExternalLink,
} from "lucide-react";

// ─── Types ───
interface CreditInfo {
  creativesUsed: number;
  creativesTotal: number;
  impressionsUsed: number;
  impressionsTotal: number;
  aiCreditsUsed: number;
  aiCreditsTotal: number;
}

interface BillingInfo {
  workspaceId: string;
  name: string;
  plan: string;
  status: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  credits: CreditInfo;
}

interface Invoice {
  id: string;
  number: string;
  status: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  created: number;
  periodStart: number;
  periodEnd: number;
  pdfUrl: string;
  hostedUrl: string;
  subscriptionId: string;
  description: string;
  paid: boolean;
}

// ─── Plan Config ───
const PLANS = [
  {
    id: "free",
    name: "Free",
    description: "For individuals exploring the platform",
    priceMonthly: 0,
    icon: Shield,
    features: ["5 creatives", "1,000 impressions", "50 AI credits", "Basic analytics"],
  },
  {
    id: "starter",
    name: "Starter",
    description: "For small teams getting started",
    priceMonthly: 29,
    icon: Zap,
    features: ["50 creatives", "50K impressions", "500 AI credits", "Advanced analytics", "Priority support"],
  },
  {
    id: "growth",
    name: "Growth",
    description: "For scaling teams with more needs",
    priceMonthly: 99,
    icon: Palette,
    features: [
      "200 creatives",
      "500K impressions",
      "5,000 AI credits",
      "Team collaboration",
      "Custom branding",
      "API access",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "For professional marketing teams",
    priceMonthly: 299,
    icon: Sparkles,
    features: [
      "1,000 creatives",
      "2M impressions",
      "25K AI credits",
      "White-label exports",
      "Advanced integrations",
      "Dedicated support",
      "SSO",
    ],
  },
];

const STRIPE_PRICE_IDS: Record<string, string> = {
  starter: import.meta.env.VITE_STRIPE_STARTER_PRICE_ID || "",
  growth: import.meta.env.VITE_STRIPE_GROWTH_PRICE_ID || "",
  pro: import.meta.env.VITE_STRIPE_PRO_PRICE_ID || "",
};

// ─── Helper: format currency ───
function formatCurrency(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase() || "USD",
  }).format(cents / 100);
}

// ─── Helper: format date ───
function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── UsageMeter ───
function UsageMeter({
  label,
  used,
  total,
  color,
}: {
  label: string;
  used: number;
  total: number;
  color: string;
}) {
  const isUnlimited = total < 0;
  const percentage = isUnlimited ? 0 : Math.min((used / total) * 100, 100);
  const isNearLimit = !isUnlimited && percentage >= 80;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className={isNearLimit ? "text-red-600 font-medium" : "text-slate-500"}>
          {isUnlimited ? `${used.toLocaleString()} / Unlimited` : `${used.toLocaleString()} / ${total.toLocaleString()}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${color} ${
              isNearLimit ? "bg-red-500" : ""
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
      {isUnlimited && (
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color}`} style={{ width: "10%" }} />
        </div>
      )}
    </div>
  );
}

// ─── PlanCard ───
function PlanCard({
  plan,
  isCurrent,
  onUpgrade,
  loading,
}: {
  plan: (typeof PLANS)[0];
  isCurrent: boolean;
  onUpgrade: (planId: string) => void;
  loading: string | null;
}) {
  const Icon = plan.icon;

  return (
    <div
      className={`relative rounded-xl border-2 p-6 transition-all ${
        isCurrent
          ? "border-blue-500 bg-blue-50/50 shadow-md"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      {isCurrent && (
        <div className="absolute -top-3 left-4">
          <span className="inline-flex items-center gap-1 bg-blue-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            <CheckCircle2 size={12} />
            Current Plan
          </span>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2.5 rounded-lg ${isCurrent ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
          <Icon size={20} />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">{plan.name}</h3>
          <p className="text-xs text-slate-500">{plan.description}</p>
        </div>
      </div>

      <div className="mb-4">
        <span className="text-2xl font-bold text-slate-900">
          ${plan.priceMonthly}
        </span>
        <span className="text-slate-500 text-sm">/mo</span>
      </div>

      <ul className="space-y-2 mb-6">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-slate-600">
            <CheckCircle2 size={15} className="text-green-500 mt-0.5 shrink-0" />
            {feature}
          </li>
        ))}
      </ul>

      {!isCurrent && plan.id !== "free" && (
        <button
          onClick={() => onUpgrade(plan.id)}
          disabled={loading === plan.id}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
        >
          {loading === plan.id ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <ArrowUpRight size={16} />
          )}
          {plan.priceMonthly === 0 ? "Downgrade" : "Upgrade"}
        </button>
      )}

      {isCurrent && (
        <div className="w-full py-2.5 px-4 bg-blue-100 text-blue-700 text-sm font-medium rounded-lg text-center">
          Your Current Plan
        </div>
      )}

      {!isCurrent && plan.id === "free" && (
        <div className="w-full py-2.5 px-4 bg-slate-100 text-slate-500 text-sm font-medium rounded-lg text-center">
          Free
        </div>
      )}
    </div>
  );
}

// ─── Main Billing Page ───
export default function BillingPage() {
  const { workspace } = useWorkspace();
  const [searchParams] = useSearchParams();
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const successParam = searchParams.get("success");
  const canceledParam = searchParams.get("canceled");

  // Handle URL params from Stripe redirect
  useEffect(() => {
    if (successParam === "true") {
      setSuccess("Your subscription has been activated successfully!");
      const timer = setTimeout(() => setSuccess(null), 8000);
      return () => clearTimeout(timer);
    }
    if (canceledParam === "true") {
      setError("Checkout was canceled. Your plan has not changed.");
      const timer = setTimeout(() => setError(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [successParam, canceledParam]);

  // Fetch billing info
  useEffect(() => {
    if (!workspace?.id) return;

    let canceled = false;

    async function fetchBilling() {
      try {
        setLoading(true);
        const [billingRes, invoicesRes] = await Promise.all([
          api.get(`/billing`),
          api.get(`/billing/invoices`),
        ]);

        if (!canceled) {
          setBilling(billingRes.data);
          setInvoices(invoicesRes.data.invoices || []);
          setError(null);
        }
      } catch (err: any) {
        if (!canceled) {
          setError(err.response?.data?.message || "Failed to load billing information");
        }
      } finally {
        if (!canceled) setLoading(false);
      }
    }

    fetchBilling();
    return () => { canceled = true; };
  }, [workspace?.id]);

  // Handle plan upgrade
  const handleUpgrade = async (planId: string) => {
    const priceId = STRIPE_PRICE_IDS[planId];
    if (!priceId) {
      setError("Price ID not configured for this plan");
      return;
    }

    try {
      setUpgradeLoading(planId);
      const { data } = await api.post("/billing/checkout", {
        priceId,
        successUrl: `${window.location.origin}/billing?success=true`,
        cancelUrl: `${window.location.origin}/billing?canceled=true`,
      });

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to start checkout");
      setUpgradeLoading(null);
    }
  };

  // Handle open Stripe portal
  const handleOpenPortal = async () => {
    try {
      setPortalLoading(true);
      const { data } = await api.post("/billing/portal", {
        returnUrl: `${window.location.origin}/billing`,
      });

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to open billing portal");
      setPortalLoading(false);
    }
  };

  const currentPlan = billing?.plan || "free";

  // ─── Loading State ───
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 size={32} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Billing</h1>
        <p className="text-slate-500 mt-1">Manage your subscription, usage, and invoices</p>
      </div>

      {/* Alerts */}
      {success && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          <CheckCircle2 size={18} className="shrink-0" />
          <span className="text-sm font-medium">{success}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          <AlertCircle size={18} className="shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* ─── Current Plan Card ─── */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Current Plan</h2>
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
              billing?.status === "active"
                ? "bg-green-100 text-green-700"
                : billing?.status === "past_due"
                ? "bg-red-100 text-red-700"
                : billing?.status === "trialing"
                ? "bg-purple-100 text-purple-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {billing?.status || "inactive"}
            {billing?.cancelAtPeriodEnd && (
              <span className="ml-1 text-red-600">(cancels at period end)</span>
            )}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="text-3xl font-bold text-slate-900 capitalize">
              {currentPlan} Plan
            </div>
            {billing?.currentPeriodEnd && (
              <p className="text-sm text-slate-500 mt-1">
                Current period ends{" "}
                {formatDate(Math.floor(new Date(billing.currentPeriodEnd).getTime() / 1000))}
                {billing?.cancelAtPeriodEnd && (
                  <span className="text-red-500 font-medium"> — Subscription will cancel</span>
                )}
              </p>
            )}
          </div>
          <button
            onClick={handleOpenPortal}
            disabled={portalLoading || !billing?.stripeCustomerId}
            className="inline-flex items-center gap-2 py-2.5 px-5 bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {portalLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CreditCard size={16} />
            )}
            Manage Payment Methods
            <ExternalLink size={14} className="text-slate-400" />
          </button>
        </div>

        {/* ─── Usage Meters ─── */}
        {billing?.credits && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
            <UsageMeter
              label="Creatives"
              used={billing.credits.creativesUsed}
              total={billing.credits.creativesTotal}
              color="bg-blue-500"
            />
            <UsageMeter
              label="Impressions"
              used={billing.credits.impressionsUsed}
              total={billing.credits.impressionsTotal}
              color="bg-emerald-500"
            />
            <UsageMeter
              label="AI Credits"
              used={billing.credits.aiCreditsUsed}
              total={billing.credits.aiCreditsTotal}
              color="bg-purple-500"
            />
          </div>
        )}
      </div>

      {/* ─── Plan Selection ─── */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Change Plan</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={currentPlan === plan.id}
              onUpgrade={handleUpgrade}
              loading={upgradeLoading}
            />
          ))}
        </div>
      </div>

      {/* ─── Invoice History ─── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Receipt size={18} className="text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-900">Invoice History</h2>
        </div>

        {invoices.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Receipt size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm">No invoices yet</p>
            <p className="text-slate-400 text-xs mt-1">Invoices will appear here once you have a paid subscription</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Period</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {invoice.number || invoice.id}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {invoice.periodStart && invoice.periodEnd
                        ? `${formatDate(invoice.periodStart)} - ${formatDate(invoice.periodEnd)}`
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {formatCurrency(invoice.amountDue || invoice.amountPaid, invoice.currency)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                          invoice.paid
                            ? "bg-green-100 text-green-700"
                            : invoice.status === "open"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {invoice.paid ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <AlertCircle size={12} />
                        )}
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {invoice.created ? formatDate(invoice.created) : "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {invoice.pdfUrl && (
                          <a
                            href={invoice.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                          >
                            <Download size={14} />
                            PDF
                          </a>
                        )}
                        {invoice.hostedUrl && (
                          <a
                            href={invoice.hostedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                          >
                            View
                            <ChevronRight size={14} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Billing FAQ ─── */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Billing FAQ</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <details className="group bg-white border border-slate-200 rounded-lg">
            <summary className="flex items-center justify-between cursor-pointer p-4 text-sm font-medium text-slate-700 list-none">
              How do I change or cancel my plan?
              <ChevronRight size={16} className="text-slate-400 group-open:rotate-90 transition-transform" />
            </summary>
            <p className="px-4 pb-4 text-sm text-slate-500">
              You can upgrade or downgrade at any time. Changes take effect immediately for upgrades, or at the end of your billing period for downgrades. Use the "Manage Payment Methods" button above to cancel.
            </p>
          </details>
          <details className="group bg-white border border-slate-200 rounded-lg">
            <summary className="flex items-center justify-between cursor-pointer p-4 text-sm font-medium text-slate-700 list-none">
              What happens when I reach my usage limits?
              <ChevronRight size={16} className="text-slate-400 group-open:rotate-90 transition-transform" />
            </summary>
            <p className="px-4 pb-4 text-sm text-slate-500">
              When you approach 80% of any limit, you'll see a warning. At 100%, that feature will be temporarily unavailable until you upgrade or your counters reset at the start of your next billing period.
            </p>
          </details>
          <details className="group bg-white border border-slate-200 rounded-lg">
            <summary className="flex items-center justify-between cursor-pointer p-4 text-sm font-medium text-slate-700 list-none">
              Do you offer refunds?
              <ChevronRight size={16} className="text-slate-400 group-open:rotate-90 transition-transform" />
            </summary>
            <p className="px-4 pb-4 text-sm text-slate-500">
              We offer a 14-day free trial on all paid plans. If you're not satisfied, contact support within 7 days of your first charge for a full refund.
            </p>
          </details>
          <details className="group bg-white border border-slate-200 rounded-lg">
            <summary className="flex items-center justify-between cursor-pointer p-4 text-sm font-medium text-slate-700 list-none">
              Can I get an invoice for my company?
              <ChevronRight size={16} className="text-slate-400 group-open:rotate-90 transition-transform" />
            </summary>
            <p className="px-4 pb-4 text-sm text-slate-500">
              Yes! All paid subscriptions include downloadable PDF invoices. You can also add your company details in the Stripe Customer Portal via "Manage Payment Methods".
            </p>
          </details>
        </div>
      </div>
    </div>
  );
}
