import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import PublicRoute from './components/PublicRoute'
import PageTransition from './components/PageTransition'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Campaigns from './pages/Campaigns'
import Ads from './pages/Ads'
import AIAgent from './pages/AIAgent'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import ForgotPassword from './pages/ForgotPassword'
import Onboarding from './pages/Onboarding'
import Inbox from './pages/Inbox'
import Drafts from './pages/Drafts'
import Audit from './pages/Audit'
import AuditLog from './pages/AuditLog'
import Agency from './pages/Agency'
import CreativeBrief from './pages/CreativeBrief'
import Blog from './pages/Blog'
import BlogPost from './pages/BlogPost'
import ComparePipeboard from './pages/ComparePipeboard'
import CompareMadgicx from './pages/CompareMadgicx'

import ABTesting from './pages/ABTesting'
import AudienceManager from './pages/AudienceManager'
import BudgetPacing from './pages/BudgetPacing'
import MorningBrief from './pages/MorningBrief'
import SlackIntegration from './pages/SlackIntegration'
import AICreativeStudio from './pages/AICreativeStudio'
import CampaignTemplates from './pages/CampaignTemplates'
import MobileApproval from './pages/MobileApproval'
import DeveloperPortal from './pages/DeveloperPortal'
import ExportCenter from './pages/ExportCenter'
import CreditUsage from './pages/CreditUsage'
import ClientScopes from './pages/ClientScopes'

import GoalTracker from './pages/GoalTracker'
import Forecasting from './pages/Forecasting'
import CampaignCalendar from './pages/CampaignCalendar'
import CompetitiveIntel from './pages/CompetitiveIntel'
import PortfolioOptimizer from './pages/PortfolioOptimizer'
import Integrations from './pages/Integrations'
import Profile from './pages/Profile'
import Pricing from './pages/Pricing'
import CreativeIntelligence from './pages/CreativeIntelligence'
import Help from './pages/Help'
import Changelog from './pages/Changelog'
import Attribution from './pages/Attribution'
import FunnelAnalysis from './pages/FunnelAnalysis'

import Schedule from './pages/Schedule'
import Appearance from './pages/Appearance'

import NotificationPrefs from './pages/NotificationPrefs'
import Admin from './pages/Admin'
import ApiKeys from './pages/ApiKeys'
import AlertsConfig from './pages/AlertsConfig'

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

          <Route path="/pricing" element={<PageTransition><Pricing /></PageTransition>} />

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
        </Routes>
      </AnimatePresence>
    </Layout>
  )
}
