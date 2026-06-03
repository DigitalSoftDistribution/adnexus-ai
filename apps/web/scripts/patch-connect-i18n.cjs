/* i18n patcher for the Connect cluster (integrations + webhooks) and onboarding.
 * Non-destructive: only adds missing keys. Localized per-locale. */
const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = path.join(__dirname, '..', 'messages');

const T = {
  en: {
    integrations: { available: 'Available', disconnect: 'Disconnect' },
    webhooks: { addWebhook: 'Add webhook', empty: 'No webhooks configured', emptyDescription: 'Create a webhook to receive real-time events.', endpoint: 'Endpoint URL', events: 'Events', active: 'Active' },
    onboarding: { title: 'Welcome to AdNexus AI', description: "Let's get your workspace set up in a few steps.", stepConnect: 'Connect a platform', stepConnectDesc: 'Link Meta, Google, TikTok or Snap to import campaigns.', stepTeam: 'Invite your team', stepTeamDesc: 'Add teammates to collaborate on campaigns.', stepCampaign: 'Create your first campaign', stepCampaignDesc: 'Launch or draft a campaign to see AdNexus in action.', skip: 'Skip for now', finish: 'Go to dashboard', completed: 'Completed' },
  },
  de: {
    integrations: { available: 'Verfügbar', disconnect: 'Trennen' },
    webhooks: { addWebhook: 'Webhook hinzufügen', empty: 'Keine Webhooks konfiguriert', emptyDescription: 'Erstellen Sie einen Webhook, um Echtzeit-Ereignisse zu empfangen.', endpoint: 'Endpunkt-URL', events: 'Ereignisse', active: 'Aktiv' },
    onboarding: { title: 'Willkommen bei AdNexus AI', description: 'Richten wir Ihren Arbeitsbereich in wenigen Schritten ein.', stepConnect: 'Plattform verbinden', stepConnectDesc: 'Verbinden Sie Meta, Google, TikTok oder Snap, um Kampagnen zu importieren.', stepTeam: 'Team einladen', stepTeamDesc: 'Fügen Sie Teammitglieder zur Zusammenarbeit hinzu.', stepCampaign: 'Erste Kampagne erstellen', stepCampaignDesc: 'Starten oder entwerfen Sie eine Kampagne.', skip: 'Vorerst überspringen', finish: 'Zum Dashboard', completed: 'Abgeschlossen' },
  },
  es: {
    integrations: { available: 'Disponible', disconnect: 'Desconectar' },
    webhooks: { addWebhook: 'Añadir webhook', empty: 'No hay webhooks configurados', emptyDescription: 'Crea un webhook para recibir eventos en tiempo real.', endpoint: 'URL del endpoint', events: 'Eventos', active: 'Activo' },
    onboarding: { title: 'Bienvenido a AdNexus AI', description: 'Configuremos tu espacio de trabajo en unos pasos.', stepConnect: 'Conectar una plataforma', stepConnectDesc: 'Vincula Meta, Google, TikTok o Snap para importar campañas.', stepTeam: 'Invita a tu equipo', stepTeamDesc: 'Añade compañeros para colaborar en campañas.', stepCampaign: 'Crea tu primera campaña', stepCampaignDesc: 'Lanza o crea un borrador de campaña.', skip: 'Omitir por ahora', finish: 'Ir al panel', completed: 'Completado' },
  },
  fr: {
    integrations: { available: 'Disponible', disconnect: 'Déconnecter' },
    webhooks: { addWebhook: 'Ajouter un webhook', empty: 'Aucun webhook configuré', emptyDescription: 'Créez un webhook pour recevoir des événements en temps réel.', endpoint: "URL du point de terminaison", events: 'Événements', active: 'Actif' },
    onboarding: { title: 'Bienvenue sur AdNexus AI', description: 'Configurons votre espace de travail en quelques étapes.', stepConnect: 'Connecter une plateforme', stepConnectDesc: 'Reliez Meta, Google, TikTok ou Snap pour importer des campagnes.', stepTeam: 'Invitez votre équipe', stepTeamDesc: 'Ajoutez des collègues pour collaborer.', stepCampaign: 'Créez votre première campagne', stepCampaignDesc: 'Lancez ou créez un brouillon de campagne.', skip: 'Ignorer pour le moment', finish: 'Aller au tableau de bord', completed: 'Terminé' },
  },
  it: {
    integrations: { available: 'Disponibile', disconnect: 'Disconnetti' },
    webhooks: { addWebhook: 'Aggiungi webhook', empty: 'Nessun webhook configurato', emptyDescription: 'Crea un webhook per ricevere eventi in tempo reale.', endpoint: "URL endpoint", events: 'Eventi', active: 'Attivo' },
    onboarding: { title: 'Benvenuto in AdNexus AI', description: 'Configuriamo la tua area di lavoro in pochi passaggi.', stepConnect: 'Connetti una piattaforma', stepConnectDesc: 'Collega Meta, Google, TikTok o Snap per importare le campagne.', stepTeam: 'Invita il tuo team', stepTeamDesc: 'Aggiungi colleghi per collaborare.', stepCampaign: 'Crea la tua prima campagna', stepCampaignDesc: 'Avvia o crea una bozza di campagna.', skip: 'Salta per ora', finish: 'Vai alla dashboard', completed: 'Completato' },
  },
  nl: {
    integrations: { available: 'Beschikbaar', disconnect: 'Loskoppelen' },
    webhooks: { addWebhook: 'Webhook toevoegen', empty: 'Geen webhooks geconfigureerd', emptyDescription: 'Maak een webhook om realtime gebeurtenissen te ontvangen.', endpoint: 'Endpoint-URL', events: 'Gebeurtenissen', active: 'Actief' },
    onboarding: { title: 'Welkom bij AdNexus AI', description: 'Laten we je werkruimte in een paar stappen instellen.', stepConnect: 'Verbind een platform', stepConnectDesc: 'Koppel Meta, Google, TikTok of Snap om campagnes te importeren.', stepTeam: 'Nodig je team uit', stepTeamDesc: 'Voeg teamleden toe om samen te werken.', stepCampaign: 'Maak je eerste campagne', stepCampaignDesc: 'Start of maak een conceptcampagne.', skip: 'Voorlopig overslaan', finish: 'Naar dashboard', completed: 'Voltooid' },
  },
  pl: {
    integrations: { available: 'Dostępne', disconnect: 'Rozłącz' },
    webhooks: { addWebhook: 'Dodaj webhook', empty: 'Brak skonfigurowanych webhooków', emptyDescription: 'Utwórz webhook, aby odbierać zdarzenia w czasie rzeczywistym.', endpoint: 'URL punktu końcowego', events: 'Zdarzenia', active: 'Aktywny' },
    onboarding: { title: 'Witamy w AdNexus AI', description: 'Skonfigurujmy Twój obszar roboczy w kilku krokach.', stepConnect: 'Połącz platformę', stepConnectDesc: 'Połącz Meta, Google, TikTok lub Snap, aby zaimportować kampanie.', stepTeam: 'Zaproś swój zespół', stepTeamDesc: 'Dodaj członków zespołu do współpracy.', stepCampaign: 'Utwórz pierwszą kampanię', stepCampaignDesc: 'Uruchom lub utwórz wersję roboczą kampanii.', skip: 'Pomiń na razie', finish: 'Przejdź do panelu', completed: 'Ukończono' },
  },
  pt: {
    integrations: { available: 'Disponível', disconnect: 'Desconectar' },
    webhooks: { addWebhook: 'Adicionar webhook', empty: 'Nenhum webhook configurado', emptyDescription: 'Crie um webhook para receber eventos em tempo real.', endpoint: 'URL do endpoint', events: 'Eventos', active: 'Ativo' },
    onboarding: { title: 'Bem-vindo ao AdNexus AI', description: 'Vamos configurar o seu espaço de trabalho em alguns passos.', stepConnect: 'Conectar uma plataforma', stepConnectDesc: 'Ligue Meta, Google, TikTok ou Snap para importar campanhas.', stepTeam: 'Convide a sua equipa', stepTeamDesc: 'Adicione colegas para colaborar.', stepCampaign: 'Crie a sua primeira campanha', stepCampaignDesc: 'Lance ou crie um rascunho de campanha.', skip: 'Ignorar por agora', finish: 'Ir para o painel', completed: 'Concluído' },
  },
  ru: {
    integrations: { available: 'Доступно', disconnect: 'Отключить' },
    webhooks: { addWebhook: 'Добавить вебхук', empty: 'Вебхуки не настроены', emptyDescription: 'Создайте вебхук для получения событий в реальном времени.', endpoint: 'URL конечной точки', events: 'События', active: 'Активен' },
    onboarding: { title: 'Добро пожаловать в AdNexus AI', description: 'Настроим вашу рабочую область за несколько шагов.', stepConnect: 'Подключить платформу', stepConnectDesc: 'Подключите Meta, Google, TikTok или Snap для импорта кампаний.', stepTeam: 'Пригласите команду', stepTeamDesc: 'Добавьте коллег для совместной работы.', stepCampaign: 'Создайте первую кампанию', stepCampaignDesc: 'Запустите или создайте черновик кампании.', skip: 'Пропустить пока', finish: 'Перейти к панели', completed: 'Завершено' },
  },
  ja: {
    integrations: { available: '利用可能', disconnect: '切断' },
    webhooks: { addWebhook: 'Webhookを追加', empty: 'Webhookが設定されていません', emptyDescription: 'リアルタイムイベントを受信するにはWebhookを作成します。', endpoint: 'エンドポイントURL', events: 'イベント', active: '有効' },
    onboarding: { title: 'AdNexus AIへようこそ', description: '数ステップでワークスペースを設定しましょう。', stepConnect: 'プラットフォームを接続', stepConnectDesc: 'Meta、Google、TikTok、Snapを連携してキャンペーンをインポートします。', stepTeam: 'チームを招待', stepTeamDesc: 'メンバーを追加して共同作業します。', stepCampaign: '最初のキャンペーンを作成', stepCampaignDesc: 'キャンペーンを開始または下書きします。', skip: '今はスキップ', finish: 'ダッシュボードへ', completed: '完了' },
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

  for (const ns of ['integrations', 'webhooks', 'onboarding']) {
    json[ns] = json[ns] || {};
    for (const [k, v] of Object.entries(copy[ns])) setIfMissing(json[ns], k, v);
  }

  fs.writeFileSync(full, JSON.stringify(json, null, 2) + '\n');
  console.log('patched', file);
}
