import { MorningBriefData, WeeklySummaryData, AlertData } from './email';

/** Escape user/AI-supplied text before interpolating it into email HTML. */
function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const colors = {
  primary: '#2563EB',
  primaryHover: '#1D4ED8',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  white: '#FFFFFF',
};

const emailWrapper = (content: string, appUrl: string): string => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AdNexus AI</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 10px !important; }
      .kpi-grid { display: block !important; }
      .kpi-card { width: 100% !important; margin-bottom: 12px !important; }
      .recommendation-card { padding: 16px !important; }
      .header-title { font-size: 20px !important; }
      .btn { display: block !important; width: 100% !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${colors.gray100}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${colors.gray100};">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="container" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: ${colors.white}; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${colors.primary} 0%, #1E40AF 100%); padding: 30px 40px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center;">
                    <span style="font-size: 28px; font-weight: 800; color: ${colors.white}; letter-spacing: -0.5px;">AdNexus</span>
                    <span style="font-size: 28px; font-weight: 300; color: rgba(255,255,255,0.85); margin-left: 4px;">AI</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 0;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: ${colors.gray50}; padding: 24px 40px; text-align: center; border-top: 1px solid ${colors.gray200};">
              <p style="margin: 0 0 8px; font-size: 12px; color: ${colors.gray400};">
                Powered by <strong style="color: ${colors.gray600};">AdNexus AI</strong> — Autonomous Advertising Intelligence
              </p>
              <p style="margin: 0; font-size: 12px; color: ${colors.gray400};">
                <a href="${appUrl}/settings/notifications" style="color: ${colors.primary}; text-decoration: none;">Manage email preferences</a> ·
                <a href="${appUrl}/unsubscribe" style="color: ${colors.primary}; text-decoration: none;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const button = (label: string, url: string, style: 'primary' | 'success' | 'danger' | 'outline' = 'primary'): string => {
  const styles = {
    primary: `background-color: ${colors.primary}; color: ${colors.white};`,
    success: `background-color: ${colors.success}; color: ${colors.white};`,
    danger: `background-color: ${colors.danger}; color: ${colors.white};`,
    outline: `background-color: ${colors.white}; color: ${colors.primary}; border: 1px solid ${colors.primary};`,
  };
  return `<a href="${url}" class="btn" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px; ${styles[style]}">${label}</a>`;
};

const severityBadge = (severity: string): string => {
  const styles: Record<string, string> = {
    critical: `background-color: #FEE2E2; color: ${colors.danger}; border: 1px solid #FECACA;`,
    warning: `background-color: #FEF3C7; color: ${colors.warning}; border: 1px solid #FDE68A;`,
    info: `background-color: #DBEAFE; color: ${colors.info}; border: 1px solid #BFDBFE;`,
  };
  const style = styles[severity] || styles.info;
  const icon = severity === 'critical' ? '🚨' : severity === 'warning' ? '⚠️' : 'ℹ️';
  return `<span style="display: inline-block; padding: 4px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 20px; ${style}">${icon} ${severity}</span>`;
};

const typeBadge = (type: string): string => {
  const labels: Record<string, string> = {
    budget: '💰 Budget',
    performance: '📊 Performance',
    anomaly: '🔍 Anomaly',
    opportunity: '💡 Opportunity',
    error: '❌ Error',
  };
  return `<span style="display: inline-block; padding: 3px 10px; font-size: 11px; font-weight: 600; color: ${colors.gray600}; background-color: ${colors.gray100}; border-radius: 20px;">${labels[type] || type}</span>`;
};

const impactBadge = (impact: string): string => {
  const styles: Record<string, string> = {
    high: `background-color: #FEE2E2; color: ${colors.danger};`,
    medium: `background-color: #FEF3C7; color: ${colors.warning};`,
    low: `background-color: #DBEAFE; color: ${colors.info};`,
  };
  const style = styles[impact] || styles.low;
  return `<span style="display: inline-block; padding: 3px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 6px; ${style}">${impact}</span>`;
};

const changeIndicator = (change: number): string => {
  const isPositive = change >= 0;
  const color = isPositive ? colors.success : colors.danger;
  const arrow = isPositive ? '▲' : '▼';
  return `<span style="font-size: 13px; font-weight: 600; color: ${color};">${arrow} ${Math.abs(change).toFixed(1)}%</span>`;
};

// ─────────────────────────────────────────────────────────────────────────────
// MORNING BRIEF TEMPLATE
// ─────────────────────────────────────────────────────────────────────────────
export function morningBriefTemplate(data: MorningBriefData, appUrl: string): string {
  const kpiCards = `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="kpi-grid" style="margin-bottom: 32px;">
      <tr>
        ${[
          { label: 'Spend', value: `$${data.kpis.spend.value.toLocaleString()}`, change: data.kpis.spend.change },
          { label: 'ROAS', value: `${data.kpis.roas.value}x`, change: data.kpis.roas.change },
          { label: 'Conversions', value: data.kpis.conversions.value.toLocaleString(), change: data.kpis.conversions.change },
          { label: 'CPA', value: `$${data.kpis.cpa.value}`, change: data.kpis.cpa.change, invert: true },
        ].map((kpi) => `
          <td class="kpi-card" style="width: 25%; padding: 16px; background-color: ${colors.gray50}; border-radius: 10px; border: 1px solid ${colors.gray200}; margin-right: 8px;">
            <p style="margin: 0 0 4px; font-size: 11px; font-weight: 600; color: ${colors.gray400}; text-transform: uppercase; letter-spacing: 0.5px;">${kpi.label}</p>
            <p style="margin: 0 0 6px; font-size: 22px; font-weight: 700; color: ${colors.gray900}; line-height: 1.2;">${kpi.value}</p>
            ${changeIndicator(kpi.invert ? -kpi.change : kpi.change)}
          </td>
        `).join('<td style="width: 8px;"></td>')}
      </tr>
    </table>`;

  const winnersSection = data.topWinners.length > 0 ? `
    <div style="margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 700; color: ${colors.gray700}; text-transform: uppercase; letter-spacing: 0.5px;">🏆 Top Winners</h3>
      ${data.topWinners.map((w) => `
        <div style="padding: 12px 16px; background-color: #ECFDF5; border-radius: 8px; margin-bottom: 8px; border-left: 4px solid ${colors.success};">
          <span style="font-size: 14px; font-weight: 600; color: ${colors.gray800};">${escapeHtml(w.name)}</span>
          <span style="float: right; font-size: 13px; font-weight: 700; color: ${colors.success};">+${w.change}% ${w.metric}</span>
        </div>
      `).join('')}
    </div>` : '';

  const losersSection = data.topLosers.length > 0 ? `
    <div style="margin-bottom: 32px;">
      <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 700; color: ${colors.gray700}; text-transform: uppercase; letter-spacing: 0.5px;">📉 Needs Attention</h3>
      ${data.topLosers.map((l) => `
        <div style="padding: 12px 16px; background-color: #FEF2F2; border-radius: 8px; margin-bottom: 8px; border-left: 4px solid ${colors.danger};">
          <span style="font-size: 14px; font-weight: 600; color: ${colors.gray800};">${escapeHtml(l.name)}</span>
          <span style="float: right; font-size: 13px; font-weight: 700; color: ${colors.danger};">${l.change}% ${l.metric}</span>
        </div>
      `).join('')}
    </div>` : '';

  const recommendationsSection = data.recommendations.length > 0 ? `
    <div style="margin-bottom: 32px;">
      <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 700; color: ${colors.gray700}; text-transform: uppercase; letter-spacing: 0.5px;">🤖 AI Recommendations</h3>
      ${data.recommendations.map((rec) => `
        <div class="recommendation-card" style="padding: 20px; background-color: ${colors.gray50}; border-radius: 10px; margin-bottom: 12px; border: 1px solid ${colors.gray200};">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="vertical-align: top;">
                ${impactBadge(rec.impact)}
                <span style="margin-left: 8px; font-size: 12px; color: ${colors.gray400};">${escapeHtml(rec.category)}</span>
              </td>
            </tr>
            <tr><td style="height: 8px;"></td></tr>
            <tr>
              <td>
                <p style="margin: 0 0 8px; font-size: 15px; font-weight: 600; color: ${colors.gray800};">${escapeHtml(rec.title)}</p>
                <p style="margin: 0 0 16px; font-size: 13px; color: ${colors.gray500}; line-height: 1.5;">${escapeHtml(rec.description)}</p>
                ${button('Create Draft', `${appUrl}/drafts/create?recommendation=${encodeURIComponent(rec.id)}`, 'primary')}
              </td>
            </tr>
          </table>
        </div>
      `).join('')}
    </div>` : '';

  const insightsSection = data.insights.length > 0 ? `
    <div style="margin-bottom: 24px;">
      <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 700; color: ${colors.gray700}; text-transform: uppercase; letter-spacing: 0.5px;">💡 Insights</h3>
      ${data.insights.map((insight) => `
        <div style="padding: 12px 16px; background-color: #EFF6FF; border-radius: 8px; margin-bottom: 8px; border-left: 4px solid ${colors.primary};">
          <span style="font-size: 13px; color: ${colors.gray600}; line-height: 1.5;">${escapeHtml(insight)}</span>
        </div>
      `).join('')}
    </div>` : '';

  const content = `
    <div style="padding: 32px 40px;">
      <p style="margin: 0 0 4px; font-size: 14px; color: ${colors.gray400}; text-transform: uppercase; letter-spacing: 1px;">Daily Brief</p>
      <h1 class="header-title" style="margin: 0 0 8px; font-size: 26px; font-weight: 700; color: ${colors.gray900}; letter-spacing: -0.5px;">${data.date}</h1>
      <p style="margin: 0 0 24px; font-size: 14px; color: ${colors.gray500};">${escapeHtml(data.workspaceName)}</p>

      ${kpiCards}
      ${winnersSection}
      ${losersSection}
      ${recommendationsSection}
      ${insightsSection}

      <div style="text-align: center; padding-top: 16px;">
        ${button('View Full Dashboard', `${appUrl}/dashboard`, 'outline')}
      </div>
    </div>`;

  return emailWrapper(content, appUrl);
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAFT APPROVAL TEMPLATE
// ─────────────────────────────────────────────────────────────────────────────
export function draftApprovalTemplate(draft: {
  id: string;
  campaignName: string;
  proposedBy: string;
  changes: Array<{ field: string; from: string; to: string; reason: string }>;
  estimatedImpact?: { additionalSpend: number; projectedRoas: number; projectedConversions: number };
  /** Free-text impact estimate (drafts.impact_estimate) shown when structured numbers aren't available */
  impactSummary?: string;
}, appUrl: string): string {
  // Draft fields originate from user/AI free text — escape before rendering
  const changesTable = draft.changes.map((change) => `
    <tr>
      <td style="padding: 14px 16px; font-size: 13px; font-weight: 600; color: ${colors.gray700}; border-bottom: 1px solid ${colors.gray200}; background-color: ${colors.gray50};">${escapeHtml(change.field)}</td>
      <td style="padding: 14px 16px; font-size: 13px; color: ${colors.danger}; border-bottom: 1px solid ${colors.gray200};"><s>${escapeHtml(change.from)}</s></td>
      <td style="padding: 14px 16px; font-size: 13px; color: ${colors.success}; font-weight: 600; border-bottom: 1px solid ${colors.gray200};">${escapeHtml(change.to)}</td>
      <td style="padding: 14px 16px; font-size: 12px; color: ${colors.gray500}; border-bottom: 1px solid ${colors.gray200};">${escapeHtml(change.reason)}</td>
    </tr>
  `).join('');

  const content = `
    <div style="padding: 32px 40px;">
      <p style="margin: 0 0 4px; font-size: 14px; color: ${colors.gray400}; text-transform: uppercase; letter-spacing: 1px;">Approval Required</p>
      <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: ${colors.gray900};">Draft Changes — ${escapeHtml(draft.campaignName)}</h1>
      <p style="margin: 0 0 24px; font-size: 14px; color: ${colors.gray500};">Proposed by <strong>${escapeHtml(draft.proposedBy)}</strong></p>

      <div style="margin-bottom: 32px;">
        <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 700; color: ${colors.gray700};">Proposed Changes</h3>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse; border-radius: 8px; overflow: hidden; border: 1px solid ${colors.gray200};">
          <tr style="background-color: ${colors.gray800};">
            <th style="padding: 12px 16px; font-size: 11px; font-weight: 700; color: ${colors.white}; text-transform: uppercase; letter-spacing: 0.5px; text-align: left;">Field</th>
            <th style="padding: 12px 16px; font-size: 11px; font-weight: 700; color: ${colors.white}; text-transform: uppercase; letter-spacing: 0.5px; text-align: left;">Current</th>
            <th style="padding: 12px 16px; font-size: 11px; font-weight: 700; color: ${colors.white}; text-transform: uppercase; letter-spacing: 0.5px; text-align: left;">Proposed</th>
            <th style="padding: 12px 16px; font-size: 11px; font-weight: 700; color: ${colors.white}; text-transform: uppercase; letter-spacing: 0.5px; text-align: left;">Reason</th>
          </tr>
          ${changesTable}
        </table>
      </div>

      ${draft.estimatedImpact ? `
      <div style="padding: 20px; background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%); border-radius: 10px; margin-bottom: 32px; text-align: center;">
        <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 700; color: ${colors.gray700};">📊 Estimated Impact</h3>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="text-align: center; padding: 8px;">
              <p style="margin: 0 0 4px; font-size: 11px; color: ${colors.gray400}; text-transform: uppercase; letter-spacing: 0.5px;">Additional Spend</p>
              <p style="margin: 0; font-size: 20px; font-weight: 700; color: ${colors.gray900};">$${draft.estimatedImpact.additionalSpend.toLocaleString()}</p>
            </td>
            <td style="text-align: center; padding: 8px;">
              <p style="margin: 0 0 4px; font-size: 11px; color: ${colors.gray400}; text-transform: uppercase; letter-spacing: 0.5px;">Projected ROAS</p>
              <p style="margin: 0; font-size: 20px; font-weight: 700; color: ${colors.success};">${draft.estimatedImpact.projectedRoas}x</p>
            </td>
            <td style="text-align: center; padding: 8px;">
              <p style="margin: 0 0 4px; font-size: 11px; color: ${colors.gray400}; text-transform: uppercase; letter-spacing: 0.5px;">Projected Conversions</p>
              <p style="margin: 0; font-size: 20px; font-weight: 700; color: ${colors.primary};">+${draft.estimatedImpact.projectedConversions}</p>
            </td>
          </tr>
        </table>
      </div>` : draft.impactSummary ? `
      <div style="padding: 20px; background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%); border-radius: 10px; margin-bottom: 32px; text-align: center;">
        <h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 700; color: ${colors.gray700};">📊 Estimated Impact</h3>
        <p style="margin: 0; font-size: 14px; color: ${colors.gray700};">${escapeHtml(draft.impactSummary)}</p>
      </div>` : ''}

      <div style="text-align: center;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
          <tr>
            <td style="padding-right: 12px;">${button('✓ Approve Changes', `${appUrl}/drafts/${draft.id}/approve`, 'success')}</td>
            <td>${button('✕ Request Changes', `${appUrl}/drafts/${draft.id}/reject`, 'danger')}</td>
          </tr>
        </table>
        <p style="margin: 16px 0 0; font-size: 12px; color: ${colors.gray400};">
          <a href="${appUrl}/drafts/${draft.id}" style="color: ${colors.primary}; text-decoration: none;">View full draft details →</a>
        </p>
      </div>
    </div>`;

  return emailWrapper(content, appUrl);
}

// ─────────────────────────────────────────────────────────────────────────────
// ALERT TEMPLATE
// ─────────────────────────────────────────────────────────────────────────────
export function alertTemplate(alert: AlertData, appUrl: string): string {
  const severityColors: Record<string, { bg: string; border: string }> = {
    critical: { bg: '#FEF2F2', border: colors.danger },
    warning: { bg: '#FEF3C7', border: colors.warning },
    info: { bg: '#EFF6FF', border: colors.info },
  };
  const sc = severityColors[alert.severity] || severityColors.info;

  const content = `
    <div style="padding: 32px 40px;">
      <div style="text-align: center; margin-bottom: 24px;">
        ${severityBadge(alert.severity)}
        ${typeBadge(alert.type)}
      </div>

      <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 700; color: ${colors.gray900}; text-align: center;">${escapeHtml(alert.title)}</h1>
      <p style="margin: 0 0 24px; font-size: 14px; color: ${colors.gray500}; text-align: center; line-height: 1.6;">${escapeHtml(alert.message)}</p>

      ${alert.metric ? `
        <div style="padding: 24px; background-color: ${sc.bg}; border-radius: 10px; margin-bottom: 24px; text-align: center; border: 1px solid ${sc.border}30;">
          <p style="margin: 0 0 8px; font-size: 12px; color: ${colors.gray400}; text-transform: uppercase; letter-spacing: 1px;">${escapeHtml(alert.metric)}</p>
          <p style="margin: 0 0 4px; font-size: 36px; font-weight: 800; color: ${colors.gray900};">${alert.value !== undefined ? alert.value.toLocaleString() : 'N/A'}</p>
          ${alert.threshold ? `<p style="margin: 0; font-size: 13px; color: ${colors.gray500};">Threshold: ${alert.threshold.toLocaleString()}</p>` : ''}
        </div>
      ` : ''}

      ${alert.campaignId ? `
        <div style="text-align: center; margin-bottom: 24px;">
          <p style="margin: 0 0 12px; font-size: 13px; color: ${colors.gray500};">
            Campaign: <strong>${escapeHtml(alert.campaignName || 'Unknown')}</strong>
          </p>
          ${button('View Campaign', `${appUrl}/campaigns/${alert.campaignId}`, 'primary')}
        </div>
      ` : `
        <div style="text-align: center; margin-bottom: 24px;">
          ${button('View Dashboard', `${appUrl}/dashboard`, 'primary')}
        </div>
      `}

      <div style="padding: 16px; background-color: ${colors.gray50}; border-radius: 8px; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: ${colors.gray400};">
          Alert ID: ${alert.id} · ${new Date(alert.createdAt).toLocaleString('en-US')}
        </p>
      </div>
    </div>`;

  return emailWrapper(content, appUrl);
}

// ─────────────────────────────────────────────────────────────────────────────
// WEEKLY SUMMARY TEMPLATE
// ─────────────────────────────────────────────────────────────────────────────
export function weeklySummaryTemplate(data: WeeklySummaryData, appUrl: string): string {
  const metricRow = (label: string, current: number, previous: number, change: number, prefix = '', suffix = '', invert = false) => `
    <tr>
      <td style="padding: 14px 16px; font-size: 14px; font-weight: 600; color: ${colors.gray700}; border-bottom: 1px solid ${colors.gray200};">${label}</td>
      <td style="padding: 14px 16px; font-size: 14px; font-weight: 700; color: ${colors.gray900}; border-bottom: 1px solid ${colors.gray200}; text-align: right;">${prefix}${current.toLocaleString()}${suffix}</td>
      <td style="padding: 14px 16px; font-size: 13px; color: ${colors.gray400}; border-bottom: 1px solid ${colors.gray200}; text-align: right;">${prefix}${previous.toLocaleString()}${suffix}</td>
      <td style="padding: 14px 16px; border-bottom: 1px solid ${colors.gray200}; text-align: right;">${changeIndicator(invert ? -change : change)}</td>
    </tr>
  `;

  const content = `
    <div style="padding: 32px 40px;">
      <p style="margin: 0 0 4px; font-size: 14px; color: ${colors.gray400}; text-transform: uppercase; letter-spacing: 1px;">Weekly Report</p>
      <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: ${colors.gray900};">${data.weekRange}</h1>
      <p style="margin: 0 0 24px; font-size: 14px; color: ${colors.gray500};">${escapeHtml(data.workspaceName)}</p>

      <div style="margin-bottom: 32px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse; border-radius: 8px; overflow: hidden; border: 1px solid ${colors.gray200};">
          <tr style="background-color: ${colors.gray800};">
            <th style="padding: 12px 16px; font-size: 11px; font-weight: 700; color: ${colors.white}; text-transform: uppercase; letter-spacing: 0.5px; text-align: left;">Metric</th>
            <th style="padding: 12px 16px; font-size: 11px; font-weight: 700; color: ${colors.white}; text-transform: uppercase; letter-spacing: 0.5px; text-align: right;">This Week</th>
            <th style="padding: 12px 16px; font-size: 11px; font-weight: 700; color: ${colors.white}; text-transform: uppercase; letter-spacing: 0.5px; text-align: right;">Last Week</th>
            <th style="padding: 12px 16px; font-size: 11px; font-weight: 700; color: ${colors.white}; text-transform: uppercase; letter-spacing: 0.5px; text-align: right;">Change</th>
          </tr>
          ${metricRow('Spend', data.spend.current, data.spend.previous, data.spend.change, '$')}
          ${metricRow('ROAS', data.roas.current, data.roas.previous, data.roas.change, '', 'x')}
          ${metricRow('Conversions', data.conversions.current, data.conversions.previous, data.conversions.change)}
          ${metricRow('CPA', data.cpa.current, data.cpa.previous, data.cpa.change, '$', '', true)}
          ${metricRow('Impressions', data.impressions.current, data.impressions.previous, data.impressions.change)}
          ${metricRow('Clicks', data.clicks.current, data.clicks.previous, data.clicks.change)}
        </table>
      </div>

      <div style="padding: 20px; background-color: ${colors.gray50}; border-radius: 10px; margin-bottom: 32px;">
        <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 700; color: ${colors.gray700};">🤖 AI This Week</h3>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="text-align: center; padding: 8px;">
              <p style="margin: 0; font-size: 24px; font-weight: 800; color: ${colors.primary};">${data.aiActions}</p>
              <p style="margin: 4px 0 0; font-size: 12px; color: ${colors.gray400};">Actions Taken</p>
            </td>
            <td style="text-align: center; padding: 8px;">
              <p style="margin: 0; font-size: 24px; font-weight: 800; color: ${colors.success};">${data.draftsCreated}</p>
              <p style="margin: 4px 0 0; font-size: 12px; color: ${colors.gray400};">Drafts Created</p>
            </td>
            <td style="text-align: center; padding: 8px;">
              <p style="margin: 0; font-size: 24px; font-weight: 800; color: ${colors.warning};">${data.timeSaved}</p>
              <p style="margin: 4px 0 0; font-size: 12px; color: ${colors.gray400};">Time Saved</p>
            </td>
          </tr>
        </table>
      </div>

      ${data.topCampaigns.length > 0 ? `
        <div style="margin-bottom: 24px;">
          <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 700; color: ${colors.gray700};">🏆 Top Performing Campaigns</h3>
          ${data.topCampaigns.map((camp) => `
            <div style="padding: 14px 16px; background-color: ${colors.gray50}; border-radius: 8px; margin-bottom: 8px; border: 1px solid ${colors.gray200};">
              <span style="font-size: 14px; font-weight: 600; color: ${colors.gray800};">${escapeHtml(camp.name)}</span>
              <span style="float: right; font-size: 13px; color: ${colors.gray500};">
                $${camp.spend.toLocaleString()} spend · ${camp.roas}x ROAS · ${camp.conversions} conv
              </span>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div style="text-align: center;">
        ${button('View Full Report', `${appUrl}/reports/weekly`, 'primary')}
      </div>
    </div>`;

  return emailWrapper(content, appUrl);
}

// ─────────────────────────────────────────────────────────────────────────────
// WELCOME TEMPLATE
// ─────────────────────────────────────────────────────────────────────────────
export function welcomeTemplate(user: { name: string; email: string; workspaceName: string }, appUrl: string): string {
  const content = `
    <div style="padding: 32px 40px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="font-size: 48px; margin-bottom: 8px;">🚀</div>
        <h1 style="margin: 0 0 8px; font-size: 26px; font-weight: 700; color: ${colors.gray900};">Welcome to AdNexus AI, ${escapeHtml(user.name)}!</h1>
        <p style="margin: 0; font-size: 15px; color: ${colors.gray500}; line-height: 1.5;">Your autonomous advertising intelligence platform is ready.</p>
      </div>

      <div style="padding: 20px; background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%); border-radius: 10px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px; font-size: 15px; font-weight: 700; color: ${colors.gray800};">⚡ Quick Start — 3 Steps</h3>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="padding: 12px 0; vertical-align: top; width: 32px;">
              <div style="width: 28px; height: 28px; background-color: ${colors.primary}; color: ${colors.white}; border-radius: 50%; text-align: center; line-height: 28px; font-size: 14px; font-weight: 700;">1</div>
            </td>
            <td style="padding: 12px 0 12px 12px; vertical-align: top;">
              <p style="margin: 0 0 4px; font-size: 14px; font-weight: 600; color: ${colors.gray800};">Connect Your Ad Platforms</p>
              <p style="margin: 0; font-size: 13px; color: ${colors.gray500};">Link Google Ads, Facebook Ads, TikTok, and more in seconds.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; vertical-align: top;">
              <div style="width: 28px; height: 28px; background-color: ${colors.primary}; color: ${colors.white}; border-radius: 50%; text-align: center; line-height: 28px; font-size: 14px; font-weight: 700;">2</div>
            </td>
            <td style="padding: 12px 0 12px 12px; vertical-align: top;">
              <p style="margin: 0 0 4px; font-size: 14px; font-weight: 600; color: ${colors.gray800};">Set Your Goals & Rules</p>
              <p style="margin: 0; font-size: 13px; color: ${colors.gray500};">Define ROAS targets, CPA limits, and automation preferences.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; vertical-align: top;">
              <div style="width: 28px; height: 28px; background-color: ${colors.primary}; color: ${colors.white}; border-radius: 50%; text-align: center; line-height: 28px; font-size: 14px; font-weight: 700;">3</div>
            </td>
            <td style="padding: 12px 0 12px 12px; vertical-align: top;">
              <p style="margin: 0 0 4px; font-size: 14px; font-weight: 600; color: ${colors.gray800};">Let AI Take the Wheel</p>
              <p style="margin: 0; font-size: 13px; color: ${colors.gray500};">AdNexus AI monitors, optimizes, and reports 24/7.</p>
            </td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin-bottom: 24px;">
        ${button('Start Your Onboarding', `${appUrl}/onboarding`, 'primary')}
      </div>

      <div style="padding: 16px; background-color: ${colors.gray50}; border-radius: 8px; text-align: center;">
        <p style="margin: 0; font-size: 13px; color: ${colors.gray500};">
          Need help? Reply to this email or <a href="${appUrl}/support" style="color: ${colors.primary}; text-decoration: none;">contact support</a>.
        </p>
      </div>
    </div>`;

  return emailWrapper(content, appUrl);
}

// ─────────────────────────────────────────────────────────────────────────────
// ONBOARDING DAY 3 TEMPLATE
// ─────────────────────────────────────────────────────────────────────────────
export function onboardingDay3Template(appUrl: string): string {
  const content = `
    <div style="padding: 32px 40px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="font-size: 48px; margin-bottom: 8px;">⚡</div>
        <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: ${colors.gray900};">Pro Tip: Automation Rules</h1>
        <p style="margin: 0; font-size: 14px; color: ${colors.gray500};">Save hours every week with smart automation.</p>
      </div>

      <div style="margin-bottom: 24px;">
        <p style="margin: 0 0 16px; font-size: 14px; color: ${colors.gray600}; line-height: 1.6;">
          Hi there! You've been using AdNexus AI for a few days now. Here's a powerful feature that will save you the most time:
        </p>

        <div style="padding: 20px; background-color: ${colors.gray50}; border-radius: 10px; margin-bottom: 16px; border: 1px solid ${colors.gray200};">
          <h3 style="margin: 0 0 8px; font-size: 15px; font-weight: 700; color: ${colors.gray800};">🤖 Automation Rules</h3>
          <p style="margin: 0 0 12px; font-size: 13px; color: ${colors.gray500}; line-height: 1.5;">
            Create "if this, then that" rules for your campaigns. For example:
          </p>
          <ul style="margin: 0; padding-left: 20px; color: ${colors.gray600}; font-size: 13px; line-height: 1.8;">
            <li>If CPA > $50 for 3 days → Pause campaign & notify me</li>
            <li>If ROAS > 5x → Increase budget by 20%</li>
            <li>If frequency > 3 → Refresh creative automatically</li>
            <li>If spend > 80% of budget → Send alert</li>
          </ul>
        </div>

        <div style="padding: 16px; background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%); border-radius: 8px; text-align: center;">
          <p style="margin: 0; font-size: 14px; font-weight: 600; color: ${colors.success};">
            💡 Users with automation rules save an average of 6.5 hours per week
          </p>
        </div>
      </div>

      <div style="text-align: center;">
        ${button('Create Your First Rule', `${appUrl}/automation/new`, 'primary')}
      </div>
    </div>`;

  return emailWrapper(content, appUrl);
}

// ─────────────────────────────────────────────────────────────────────────────
// ONBOARDING DAY 7 TEMPLATE
// ─────────────────────────────────────────────────────────────────────────────
export function onboardingDay7Template(appUrl: string): string {
  const content = `
    <div style="padding: 32px 40px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="font-size: 48px; margin-bottom: 8px;">🎉</div>
        <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: ${colors.gray900};">One Week Down!</h1>
        <p style="margin: 0; font-size: 14px; color: ${colors.gray500};">Here's what you've accomplished and what's next.</p>
      </div>

      <div style="padding: 20px; background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%); border-radius: 10px; margin-bottom: 24px; text-align: center;">
        <p style="margin: 0 0 16px; font-size: 14px; color: ${colors.gray600};">You've been using AdNexus AI for a full week! Here's what you can unlock next:</p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="text-align: center; padding: 12px;">
              <div style="font-size: 32px; margin-bottom: 4px;">📊</div>
              <p style="margin: 0; font-size: 13px; font-weight: 600; color: ${colors.gray700};">Custom Reports</p>
              <p style="margin: 4px 0 0; font-size: 12px; color: ${colors.gray400};">Build shareable reports</p>
            </td>
            <td style="text-align: center; padding: 12px;">
              <div style="font-size: 32px; margin-bottom: 4px;">👥</div>
              <p style="margin: 0; font-size: 13px; font-weight: 600; color: ${colors.gray700};">Team Collaboration</p>
              <p style="margin: 4px 0 0; font-size: 12px; color: ${colors.gray400};">Invite your team</p>
            </td>
            <td style="text-align: center; padding: 12px;">
              <div style="font-size: 32px; margin-bottom: 4px;">🔌</div>
              <p style="margin: 0; font-size: 13px; font-weight: 600; color: ${colors.gray700};">API Access</p>
              <p style="margin: 4px 0 0; font-size: 12px; color: ${colors.gray400};">Build custom integrations</p>
            </td>
          </tr>
        </table>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 700; color: ${colors.gray700};">💡 Advanced Features to Try</h3>
        <div style="padding: 14px 16px; background-color: ${colors.gray50}; border-radius: 8px; margin-bottom: 8px;">
          <span style="font-size: 14px; font-weight: 600; color: ${colors.gray800};">Competitor Tracking</span>
          <span style="float: right;">${button('Enable', `${appUrl}/competitors`, 'outline')}</span>
        </div>
        <div style="padding: 14px 16px; background-color: ${colors.gray50}; border-radius: 8px; margin-bottom: 8px;">
          <span style="font-size: 14px; font-weight: 600; color: ${colors.gray800};">Slack Notifications</span>
          <span style="float: right;">${button('Connect', `${appUrl}/integrations/slack`, 'outline')}</span>
        </div>
        <div style="padding: 14px 16px; background-color: ${colors.gray50}; border-radius: 8px;">
          <span style="font-size: 14px; font-weight: 600; color: ${colors.gray800};">Multi-Workspace Dashboard</span>
          <span style="float: right;">${button('Explore', `${appUrl}/workspaces`, 'outline')}</span>
        </div>
      </div>

      <div style="text-align: center;">
        ${button('Go to Dashboard', `${appUrl}/dashboard`, 'primary')}
      </div>
    </div>`;

  return emailWrapper(content, appUrl);
}

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD RESET TEMPLATE
// ─────────────────────────────────────────────────────────────────────────────
export function passwordResetTemplate(token: string, appUrl: string): string {
  const resetUrl = `${appUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;

  const content = `
    <div style="padding: 32px 40px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="font-size: 48px; margin-bottom: 8px;">🔐</div>
        <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: ${colors.gray900};">Reset Your Password</h1>
        <p style="margin: 0; font-size: 14px; color: ${colors.gray500};">We received a request to reset your password.</p>
      </div>

      <div style="padding: 24px; background-color: ${colors.gray50}; border-radius: 10px; margin-bottom: 24px; text-align: center;">
        <p style="margin: 0 0 20px; font-size: 14px; color: ${colors.gray600};">
          Click the button below to reset your password. This link will expire in <strong>1 hour</strong>.
        </p>
        ${button('Reset Password', resetUrl, 'primary')}
      </div>

      <div style="padding: 16px; background-color: #FEF2F2; border-radius: 8px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 12px; color: ${colors.danger}; text-align: center;">
          ⚠️ If you didn't request this password reset, you can safely ignore this email. Your password will not be changed.
        </p>
      </div>

      <div style="text-align: center;">
        <p style="margin: 0 0 8px; font-size: 12px; color: ${colors.gray400};">Button not working? Copy and paste this link:</p>
        <p style="margin: 0; font-size: 12px; color: ${colors.primary}; word-break: break-all;">${resetUrl}</p>
      </div>
    </div>`;

  return emailWrapper(content, appUrl);
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAM INVITE TEMPLATE
// ─────────────────────────────────────────────────────────────────────────────
export function teamInviteTemplate(data: { inviterName: string; workspaceName: string; email: string }, appUrl: string): string {
  const inviteUrl = `${appUrl}/accept-invite?email=${encodeURIComponent(data.email)}`;

  const content = `
    <div style="padding: 32px 40px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="font-size: 48px; margin-bottom: 8px;">👋</div>
        <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: ${colors.gray900};">You've Been Invited!</h1>
        <p style="margin: 0; font-size: 14px; color: ${colors.gray500};">${escapeHtml(data.inviterName)} wants you to join their team.</p>
      </div>

      <div style="padding: 24px; background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%); border-radius: 10px; margin-bottom: 24px; text-align: center;">
        <p style="margin: 0 0 8px; font-size: 14px; color: ${colors.gray500};">Workspace</p>
        <p style="margin: 0 0 20px; font-size: 22px; font-weight: 700; color: ${colors.gray900};">${escapeHtml(data.workspaceName)}</p>
        <p style="margin: 0 0 20px; font-size: 14px; color: ${colors.gray600}; line-height: 1.5;">
          Join ${escapeHtml(data.workspaceName)} on AdNexus AI to collaborate on advertising campaigns, review AI-generated insights, and optimize performance together.
        </p>
        ${button('Accept Invitation', inviteUrl, 'primary')}
      </div>

      <div style="padding: 16px; background-color: ${colors.gray50}; border-radius: 8px; margin-bottom: 24px;">
        <h4 style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: ${colors.gray700};">What you'll be able to do:</h4>
        <ul style="margin: 0; padding-left: 20px; color: ${colors.gray600}; font-size: 13px; line-height: 1.8;">
          <li>View campaign performance and reports</li>
          <li>Approve or reject AI-generated draft changes</li>
          <li>Collaborate on automation rules</li>
          <li>Receive team notifications and alerts</li>
        </ul>
      </div>

      <div style="text-align: center;">
        <p style="margin: 0 0 8px; font-size: 12px; color: ${colors.gray400};">Already have an account?</p>
        <a href="${appUrl}/login?redirect=${encodeURIComponent(inviteUrl)}" style="font-size: 13px; color: ${colors.primary}; text-decoration: none; font-weight: 600;">Sign in to accept →</a>
      </div>
    </div>`;

  return emailWrapper(content, appUrl);
}
