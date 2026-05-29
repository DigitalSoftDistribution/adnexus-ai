import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import PublicRoute from './components/PublicRoute'
import PageTransition from './components/PageTransition'
import Home from './spa-pages/Home'
import Dashboard from './spa-pages/Dashboard'
import Campaigns from './spa-pages/Campaigns'
import Ads from './spa-pages/Ads'
import AIAgent from './spa-pages/AIAgent'
import Reports from './spa-pages/Reports'
import Settings from './spa-pages/Settings'
import SignIn from './spa-pages/SignIn'
import SignUp from './spa-pages/SignUp'
import ForgotPassword from './spa-pages/ForgotPassword'
import Onboarding from './spa-pages/Onboarding'
import Inbox from './spa-pages/Inbox'
import Drafts from './spa-pages/Drafts'
import Audit from './spa-pages/Audit'
import AuditLog from './spa-pages/AuditLog'
import Agency from './spa-pages/Agency'
import CreativeBrief from './spa-pages/CreativeBrief'
import Blog from './spa-pages/Blog'
import BlogPost from './spa-pages/BlogPost'
import ComparePipeboard from './spa-pages/ComparePipeboard'
import CompareMadgicx from './spa-pages/CompareMadgicx'
import CompareBirch from './spa-pages/CompareBirch'
import CompareSmartly from './spa-pages/CompareSmartly'
import CompareAdKit from './spa-pages/CompareAdKit'
import ToolsROASCalculator from './spa-pages/ToolsROASCalculator'

import ABTesting from './spa-pages/ABTesting'
import AudienceManager from './spa-pages/AudienceManager'
import BudgetPacing from './spa-pages/BudgetPacing'
import MorningBrief from './spa-pages/MorningBrief'
import SlackIntegration from './spa-pages/SlackIntegration'
import AICreativeStudio from './spa-pages/AICreativeStudio'
import CampaignTemplates from './spa-pages/CampaignTemplates'
import MobileApproval from './spa-pages/MobileApproval'
import DeveloperPortal from './spa-pages/DeveloperPortal'
import ExportCenter from './spa-pages/ExportCenter'
import CreditUsage from './spa-pages/CreditUsage'
import ClientScopes from './spa-pages/ClientScopes'

import GoalTracker from './spa-pages/GoalTracker'
import Forecasting from './spa-pages/Forecasting'
import CampaignCalendar from './spa-pages/CampaignCalendar'
import CompetitiveIntel from './spa-pages/CompetitiveIntel'
import PortfolioOptimizer from './spa-pages/PortfolioOptimizer'
import Integrations from './spa-pages/Integrations'
import Profile from './spa-pages/Profile'
import Pricing from './spa-pages/Pricing'
import CreativeIntelligence from './spa-pages/CreativeIntelligence'
import Help from './spa-pages/Help'
import Changelog from './spa-pages/Changelog'
import Attribution from './spa-pages/Attribution'
import FunnelAnalysis from './spa-pages/FunnelAnalysis'

import Schedule from './spa-pages/Schedule'
import Appearance from './spa-pages/Appearance'

import NotificationPrefs from './spa-pages/NotificationPrefs'
import Admin from './spa-pages/Admin'
import ApiKeys from './spa-pages/ApiKeys'
import AlertsConfig from './spa-pages/AlertsConfig'

export default function App() {
  const location = useLocation()

  return (
    <Layout>
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          {/* ═══════ Marketing / Public ═══════ */}
          <Route path="/" element={<PageTransition><Home /></PageTransition>} />
          <Route path="/blog" element={<PageTransition><Blog /></PageTransition>} />
          <Route path="/blog/:slug" element={<PageTransition><BlogPost /></PageTransition>} />
          <Route path="/compare/pipeboard" element={<PageTransition><ComparePipeboard /></PageTransition>} />
          <Route path="/compare/madgicx" element={<PageTransition><CompareMadgicx /></PageTransition>} />
          <Route path="/compare/birch" element={<PageTransition><CompareBirch /></PageTransition>} />
          <Route path="/compare/smartly" element={<PageTransition><CompareSmartly /></PageTransition>} />
          <Route path="/compare/adkit" element={<PageTransition><CompareAdKit /></PageTransition>} />

          <Route path="/pricing" element={<PageTransition><Pricing /></PageTransition>} />
          <Route path="/tools/roas-calculator" element={<PageTransition><ToolsROASCalculator /></PageTransition>} />

          {/* ═══════ Auth (public, redirect if authenticated) ═══════ */}
          <Route
            path="/signin"
            element={
              <PublicRoute>
                <PageTransition><SignIn /></PageTransition>
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <PageTransition><SignUp /></PageTransition>
              </PublicRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicRoute redirectAuthenticated={false}>
                <PageTransition><ForgotPassword /></PageTransition>
              </PublicRoute>
            }
          />
          <Route path="/onboarding" element={<PageTransition><Onboarding /></PageTransition>} />

          {/* ═══════ App (protected) ═══════ */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <PageTransition><Dashboard /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/campaigns"
            element={
              <ProtectedRoute>
                <PageTransition><Campaigns /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ads"
            element={
              <ProtectedRoute>
                <PageTransition><Ads /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-agent"
            element={
              <ProtectedRoute>
                <PageTransition><AIAgent /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <PageTransition><Reports /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <PageTransition><Settings /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inbox"
            element={
              <ProtectedRoute>
                <PageTransition><Inbox /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/drafts"
            element={
              <ProtectedRoute>
                <PageTransition><Drafts /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit"
            element={
              <ProtectedRoute>
                <PageTransition><Audit /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit-log"
            element={
              <ProtectedRoute>
                <PageTransition><AuditLog /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/agency"
            element={
              <ProtectedRoute>
                <PageTransition><Agency /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/creative-brief"
            element={
              <ProtectedRoute>
                <PageTransition><CreativeBrief /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/creative-intelligence"
            element={
              <ProtectedRoute>
                <PageTransition><CreativeIntelligence /></PageTransition>
              </ProtectedRoute>
            }
          />

          {/* ═══════ Phase 3 — Power User ═══════ */}
          <Route
            path="/ab-testing"
            element={
              <ProtectedRoute>
                <PageTransition><ABTesting /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/audiences"
            element={
              <ProtectedRoute>
                <PageTransition><AudienceManager /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/pacing"
            element={
              <ProtectedRoute>
                <PageTransition><BudgetPacing /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/morning-brief"
            element={
              <ProtectedRoute>
                <PageTransition><MorningBrief /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/integrations/slack"
            element={
              <ProtectedRoute>
                <PageTransition><SlackIntegration /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/integrations"
            element={
              <ProtectedRoute>
                <PageTransition><Integrations /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/creative-studio"
            element={
              <ProtectedRoute>
                <PageTransition><AICreativeStudio /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/templates"
            element={
              <ProtectedRoute>
                <PageTransition><CampaignTemplates /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/approve"
            element={
              <ProtectedRoute>
                <PageTransition><MobileApproval /></PageTransition>
              </ProtectedRoute>
            }
          />

          {/* ═══════ Phase 4 — Developer + Agency + Planning ═══════ */}
          <Route
            path="/developers"
            element={
              <ProtectedRoute>
                <PageTransition><DeveloperPortal /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/exports"
            element={
              <ProtectedRoute>
                <PageTransition><ExportCenter /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing/credits"
            element={
              <ProtectedRoute>
                <PageTransition><CreditUsage /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/agency/scopes"
            element={
              <ProtectedRoute>
                <PageTransition><ClientScopes /></PageTransition>
              </ProtectedRoute>
            }
          />

          <Route
            path="/goals"
            element={
              <ProtectedRoute>
                <PageTransition><GoalTracker /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/forecasting"
            element={
              <ProtectedRoute>
                <PageTransition><Forecasting /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <PageTransition><CampaignCalendar /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/competitive-intel"
            element={
              <ProtectedRoute>
                <PageTransition><CompetitiveIntel /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/portfolio-optimizer"
            element={
              <ProtectedRoute>
                <PageTransition><PortfolioOptimizer /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/help"
            element={
              <ProtectedRoute>
                <PageTransition><Help /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <PageTransition><Profile /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/appearance"
            element={
              <ProtectedRoute>
                <PageTransition><Appearance /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/changelog"
            element={
              <ProtectedRoute>
                <PageTransition><Changelog /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/attribution"
            element={
              <ProtectedRoute>
                <PageTransition><Attribution /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/funnel"
            element={
              <ProtectedRoute>
                <PageTransition><FunnelAnalysis /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/schedule"
            element={
              <ProtectedRoute>
                <PageTransition><Schedule /></PageTransition>
              </ProtectedRoute>
            }
          />

          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <PageTransition><NotificationPrefs /></PageTransition>
              </ProtectedRoute>
            }
          />

          {/* ═══════ Admin ═══════ */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <PageTransition><Admin /></PageTransition>
              </ProtectedRoute>
            }
          />

          {/* ═══════ API Key Management ═══════ */}
          <Route
            path="/api-keys"
            element={
              <ProtectedRoute>
                <PageTransition><ApiKeys /></PageTransition>
              </ProtectedRoute>
            }
          />

          {/* ═══════ Custom Alerts ═══════ */}
          <Route
            path="/alerts"
            element={
              <ProtectedRoute>
                <PageTransition><AlertsConfig /></PageTransition>
              </ProtectedRoute>
            }
          />

          {/* ═══════ Developer Tools ═══════ */}
          {/* Webhooks, WhiteLabelReports, ToolExplorer — pending JSX fix, see .broken originals */}
        </Routes>
      </AnimatePresence>
    </Layout>
  )
}
