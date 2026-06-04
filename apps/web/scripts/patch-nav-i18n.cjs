/* One-shot i18n patcher for the redesign nav + notifications keys.
 * Adds keys to every messages/<locale>.json with proper per-locale copy.
 * Existing keys are preserved (idempotent / non-destructive).
 */
const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = path.join(__dirname, '..', 'messages');

// Per-locale copy. `en` is the base; other locales override the new strings.
const T = {
  en: {
    nav: { goals: 'Goals', integrations: 'Integrations', webhooks: 'Webhooks', auditLog: 'Audit Log', collapse: 'Collapse', workspace: 'Workspace', newCampaign: 'New Campaign' },
    groups: { overview: 'Overview', campaigns: 'Campaigns', automation: 'Automation', connect: 'Connect', workspace: 'Workspace', create: 'Create' },
    notifications: { title: 'Notifications', markAllRead: 'Mark all read', empty: 'No notifications yet' },
  },
  de: {
    nav: { goals: 'Ziele', integrations: 'Integrationen', webhooks: 'Webhooks', auditLog: 'Audit-Log', collapse: 'Einklappen', workspace: 'Arbeitsbereich', newCampaign: 'Neue Kampagne' },
    groups: { overview: 'Übersicht', campaigns: 'Kampagnen', automation: 'Automatisierung', connect: 'Verbinden', workspace: 'Arbeitsbereich', create: 'Erstellen' },
    notifications: { title: 'Benachrichtigungen', markAllRead: 'Alle als gelesen markieren', empty: 'Noch keine Benachrichtigungen' },
  },
  es: {
    nav: { goals: 'Objetivos', integrations: 'Integraciones', webhooks: 'Webhooks', auditLog: 'Registro de auditoría', collapse: 'Contraer', workspace: 'Espacio de trabajo', newCampaign: 'Nueva campaña' },
    groups: { overview: 'Resumen', campaigns: 'Campañas', automation: 'Automatización', connect: 'Conectar', workspace: 'Espacio de trabajo', create: 'Crear' },
    notifications: { title: 'Notificaciones', markAllRead: 'Marcar todo como leído', empty: 'Aún no hay notificaciones' },
  },
  fr: {
    nav: { goals: 'Objectifs', integrations: 'Intégrations', webhooks: 'Webhooks', auditLog: "Journal d'audit", collapse: 'Réduire', workspace: 'Espace de travail', newCampaign: 'Nouvelle campagne' },
    groups: { overview: "Vue d'ensemble", campaigns: 'Campagnes', automation: 'Automatisation', connect: 'Connecter', workspace: 'Espace de travail', create: 'Créer' },
    notifications: { title: 'Notifications', markAllRead: 'Tout marquer comme lu', empty: 'Aucune notification' },
  },
  it: {
    nav: { goals: 'Obiettivi', integrations: 'Integrazioni', webhooks: 'Webhook', auditLog: 'Registro di controllo', collapse: 'Comprimi', workspace: 'Area di lavoro', newCampaign: 'Nuova campagna' },
    groups: { overview: 'Panoramica', campaigns: 'Campagne', automation: 'Automazione', connect: 'Connetti', workspace: 'Area di lavoro', create: 'Crea' },
    notifications: { title: 'Notifiche', markAllRead: 'Segna tutto come letto', empty: 'Nessuna notifica' },
  },
  nl: {
    nav: { goals: 'Doelen', integrations: 'Integraties', webhooks: 'Webhooks', auditLog: 'Auditlogboek', collapse: 'Inklappen', workspace: 'Werkruimte', newCampaign: 'Nieuwe campagne' },
    groups: { overview: 'Overzicht', campaigns: "Campagnes", automation: 'Automatisering', connect: 'Verbinden', workspace: 'Werkruimte', create: 'Aanmaken' },
    notifications: { title: 'Meldingen', markAllRead: 'Alles als gelezen markeren', empty: 'Nog geen meldingen' },
  },
  pl: {
    nav: { goals: 'Cele', integrations: 'Integracje', webhooks: 'Webhooki', auditLog: 'Dziennik audytu', collapse: 'Zwiń', workspace: 'Obszar roboczy', newCampaign: 'Nowa kampania' },
    groups: { overview: 'Przegląd', campaigns: 'Kampanie', automation: 'Automatyzacja', connect: 'Połącz', workspace: 'Obszar roboczy', create: 'Utwórz' },
    notifications: { title: 'Powiadomienia', markAllRead: 'Oznacz wszystkie jako przeczytane', empty: 'Brak powiadomień' },
  },
  pt: {
    nav: { goals: 'Objetivos', integrations: 'Integrações', webhooks: 'Webhooks', auditLog: 'Registo de auditoria', collapse: 'Recolher', workspace: 'Espaço de trabalho', newCampaign: 'Nova campanha' },
    groups: { overview: 'Visão geral', campaigns: 'Campanhas', automation: 'Automação', connect: 'Conectar', workspace: 'Espaço de trabalho', create: 'Criar' },
    notifications: { title: 'Notificações', markAllRead: 'Marcar tudo como lido', empty: 'Ainda sem notificações' },
  },
  ru: {
    nav: { goals: 'Цели', integrations: 'Интеграции', webhooks: 'Вебхуки', auditLog: 'Журнал аудита', collapse: 'Свернуть', workspace: 'Рабочая область', newCampaign: 'Новая кампания' },
    groups: { overview: 'Обзор', campaigns: 'Кампании', automation: 'Автоматизация', connect: 'Подключения', workspace: 'Рабочая область', create: 'Создать' },
    notifications: { title: 'Уведомления', markAllRead: 'Отметить все как прочитанные', empty: 'Уведомлений пока нет' },
  },
  ja: {
    nav: { goals: '目標', integrations: '連携', webhooks: 'Webhook', auditLog: '監査ログ', collapse: '折りたたむ', workspace: 'ワークスペース', newCampaign: '新規キャンペーン' },
    groups: { overview: '概要', campaigns: 'キャンペーン', automation: '自動化', connect: '連携', workspace: 'ワークスペース', create: '作成' },
    notifications: { title: '通知', markAllRead: 'すべて既読にする', empty: '通知はまだありません' },
  },
};

function setIfMissing(obj, key, value) {
  if (obj[key] === undefined) obj[key] = value;
}

const files = fs.readdirSync(MESSAGES_DIR).filter((f) => f.endsWith('.json'));
for (const file of files) {
  const locale = file.replace('.json', '');
  const copy = T[locale] || T.en;
  const full = path.join(MESSAGES_DIR, file);
  const json = JSON.parse(fs.readFileSync(full, 'utf-8'));

  json.navigation = json.navigation || {};
  for (const [k, v] of Object.entries(copy.nav)) setIfMissing(json.navigation, k, v);
  json.navigation.groups = json.navigation.groups || {};
  for (const [k, v] of Object.entries(copy.groups)) setIfMissing(json.navigation.groups, k, v);

  json.notifications = json.notifications || {};
  for (const [k, v] of Object.entries(copy.notifications)) setIfMissing(json.notifications, k, v);

  fs.writeFileSync(full, JSON.stringify(json, null, 2) + '\n');
  console.log('patched', file);
}
