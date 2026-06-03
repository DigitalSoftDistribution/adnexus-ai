/* i18n patcher for goals + auditLog page namespaces. Non-destructive. */
const fs = require('fs');
const path = require('path');
const MESSAGES_DIR = path.join(__dirname, '..', 'messages');

const T = {
  en: {
    goals: { title: 'Goals', description: 'Track performance targets across campaigns.', metric: 'Metric', target: 'Target', empty: 'No goals yet', emptyDescription: 'Create a goal to track ROAS, CPA, conversions and more.' },
    auditLog: { title: 'Audit Log', description: 'A record of every change in your workspace.', actor: 'Actor', action: 'Action', category: 'Category', entity: 'Entity', empty: 'No activity yet', emptyDescription: 'Workspace activity will appear here.' },
  },
  de: {
    goals: { title: 'Ziele', description: 'Verfolgen Sie Leistungsziele über Kampagnen hinweg.', metric: 'Kennzahl', target: 'Ziel', empty: 'Noch keine Ziele', emptyDescription: 'Erstellen Sie ein Ziel, um ROAS, CPA, Conversions und mehr zu verfolgen.' },
    auditLog: { title: 'Audit-Log', description: 'Eine Aufzeichnung jeder Änderung in Ihrem Arbeitsbereich.', actor: 'Akteur', action: 'Aktion', category: 'Kategorie', entity: 'Entität', empty: 'Noch keine Aktivität', emptyDescription: 'Arbeitsbereich-Aktivitäten erscheinen hier.' },
  },
  es: {
    goals: { title: 'Objetivos', description: 'Sigue los objetivos de rendimiento de las campañas.', metric: 'Métrica', target: 'Objetivo', empty: 'Aún no hay objetivos', emptyDescription: 'Crea un objetivo para seguir ROAS, CPA, conversiones y más.' },
    auditLog: { title: 'Registro de auditoría', description: 'Un registro de cada cambio en tu espacio de trabajo.', actor: 'Actor', action: 'Acción', category: 'Categoría', entity: 'Entidad', empty: 'Aún no hay actividad', emptyDescription: 'La actividad del espacio de trabajo aparecerá aquí.' },
  },
  fr: {
    goals: { title: 'Objectifs', description: 'Suivez les objectifs de performance des campagnes.', metric: 'Métrique', target: 'Cible', empty: "Aucun objectif", emptyDescription: 'Créez un objectif pour suivre le ROAS, le CPA, les conversions et plus.' },
    auditLog: { title: "Journal d'audit", description: 'Un registre de chaque modification dans votre espace de travail.', actor: 'Acteur', action: 'Action', category: 'Catégorie', entity: 'Entité', empty: "Aucune activité", emptyDescription: "L'activité de l'espace de travail apparaîtra ici." },
  },
  it: {
    goals: { title: 'Obiettivi', description: 'Monitora gli obiettivi di performance delle campagne.', metric: 'Metrica', target: 'Obiettivo', empty: 'Nessun obiettivo', emptyDescription: 'Crea un obiettivo per monitorare ROAS, CPA, conversioni e altro.' },
    auditLog: { title: 'Registro di controllo', description: 'Un registro di ogni modifica nella tua area di lavoro.', actor: 'Attore', action: 'Azione', category: 'Categoria', entity: 'Entità', empty: 'Nessuna attività', emptyDescription: "L'attività dell'area di lavoro apparirà qui." },
  },
  nl: {
    goals: { title: 'Doelen', description: 'Volg prestatiedoelen over campagnes heen.', metric: 'Statistiek', target: 'Doel', empty: 'Nog geen doelen', emptyDescription: 'Maak een doel om ROAS, CPA, conversies en meer te volgen.' },
    auditLog: { title: 'Auditlogboek', description: 'Een registratie van elke wijziging in je werkruimte.', actor: 'Actor', action: 'Actie', category: 'Categorie', entity: 'Entiteit', empty: 'Nog geen activiteit', emptyDescription: 'Werkruimte-activiteit verschijnt hier.' },
  },
  pl: {
    goals: { title: 'Cele', description: 'Śledź cele wydajności w kampaniach.', metric: 'Metryka', target: 'Cel', empty: 'Brak celów', emptyDescription: 'Utwórz cel, aby śledzić ROAS, CPA, konwersje i więcej.' },
    auditLog: { title: 'Dziennik audytu', description: 'Zapis każdej zmiany w obszarze roboczym.', actor: 'Wykonawca', action: 'Akcja', category: 'Kategoria', entity: 'Encja', empty: 'Brak aktywności', emptyDescription: 'Aktywność obszaru roboczego pojawi się tutaj.' },
  },
  pt: {
    goals: { title: 'Objetivos', description: 'Acompanhe metas de desempenho nas campanhas.', metric: 'Métrica', target: 'Meta', empty: 'Ainda sem objetivos', emptyDescription: 'Crie um objetivo para acompanhar ROAS, CPA, conversões e mais.' },
    auditLog: { title: 'Registo de auditoria', description: 'Um registo de cada alteração no seu espaço de trabalho.', actor: 'Ator', action: 'Ação', category: 'Categoria', entity: 'Entidade', empty: 'Ainda sem atividade', emptyDescription: 'A atividade do espaço de trabalho aparecerá aqui.' },
  },
  ru: {
    goals: { title: 'Цели', description: 'Отслеживайте целевые показатели по кампаниям.', metric: 'Метрика', target: 'Цель', empty: 'Целей пока нет', emptyDescription: 'Создайте цель для отслеживания ROAS, CPA, конверсий и другого.' },
    auditLog: { title: 'Журнал аудита', description: 'Запись каждого изменения в вашей рабочей области.', actor: 'Субъект', action: 'Действие', category: 'Категория', entity: 'Сущность', empty: 'Активности пока нет', emptyDescription: 'Активность рабочей области появится здесь.' },
  },
  ja: {
    goals: { title: '目標', description: 'キャンペーン全体のパフォーマンス目標を追跡します。', metric: '指標', target: '目標値', empty: '目標がまだありません', emptyDescription: 'ROAS、CPA、コンバージョンなどを追跡する目標を作成します。' },
    auditLog: { title: '監査ログ', description: 'ワークスペース内のすべての変更の記録。', actor: '実行者', action: 'アクション', category: 'カテゴリ', entity: 'エンティティ', empty: 'アクティビティがまだありません', emptyDescription: 'ワークスペースのアクティビティがここに表示されます。' },
  },
};

function setIfMissing(obj, key, value) { if (obj[key] === undefined) obj[key] = value; }

const files = fs.readdirSync(MESSAGES_DIR).filter((f) => f.endsWith('.json'));
for (const file of files) {
  const locale = file.replace('.json', '');
  const copy = T[locale] || T.en;
  const full = path.join(MESSAGES_DIR, file);
  const json = JSON.parse(fs.readFileSync(full, 'utf-8'));
  for (const ns of ['goals', 'auditLog']) {
    json[ns] = json[ns] || {};
    for (const [k, v] of Object.entries(copy[ns])) setIfMissing(json[ns], k, v);
  }
  fs.writeFileSync(full, JSON.stringify(json, null, 2) + '\n');
  console.log('patched', file);
}
