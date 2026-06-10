/**
 * AdNexus AI — Chinese Chat Messages
 * ----------------------------------
 * Localized content for the Chat CN widget.
 */

export interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  content: string;
  timestamp?: Date;
}

export const cnGreeting = '您好！我是 AdNexus AI 助手。我可以帮您了解我们的 AI 广告管理平台。有什么可以帮您的吗？';

export const cnSuggestions = [
  'AdNexus AI 是什么？',
  '如何开始免费试用？',
  '支持哪些广告平台？',
  '定价方案有哪些？',
  'AI 草稿审批如何工作？',
  '适合代理商使用吗？',
];

export const cnResponses: Record<string, string> = {
  'AdNexus AI 是什么？':
    'AdNexus AI 是一个智能广告活动工作区。我们的 AI 代理全天候监控您的 Meta、Google、TikTok 和 Snap 广告账户，发现问题并生成优化草稿。您在批准之前，任何更改都不会上线。',
  '如何开始免费试用？':
    '非常简单！点击页面上的"开始免费试用"按钮，2 分钟内即可完成注册。无需信用卡，随时可取消。',
  '支持哪些广告平台？':
    '我们目前支持四大主流平台：Meta（Facebook/Instagram）、Google Ads、TikTok Ads 和 Snap Ads。未来还将扩展更多平台。',
  '定价方案有哪些？':
    '我们提供扁平定价，不按广告支出比例收费：\n\n• 免费版：基础功能\n• 入门版：$49/月\n• 专业版：$149/月（最受欢迎）\n• 企业版：定制方案',
  'AI 草稿审批如何工作？':
    'AI 分析您的广告数据后，会生成优化建议作为"草稿"。您可以查看每个建议的详细 reasoning，编辑数字，然后一键批准或拒绝。所有操作都有完整的审计日志。',
  '适合代理商使用吗？':
    '非常适合！我们支持多客户工作区、团队协作、白标报告和定期报告。代理商可以轻松管理多个客户的广告账户。',
};

export const cnFallback =
  '抱歉，我暂时无法回答这个问题。您可以联系我们的团队获取更详细的解答：hi@adnexus.ai';

export const cnPlaceholders = {
  input: '输入您的问题...',
  typing: 'AI 正在思考...',
  send: '发送',
};

export const enGreeting =
  "Hi! I'm the AdNexus AI assistant. I can help you learn about our AI-powered ad management platform. What can I help you with?";

export const enSuggestions = [
  'What is AdNexus AI?',
  'How do I start a free trial?',
  'Which platforms are supported?',
  'What are the pricing plans?',
  'How does AI draft approval work?',
  'Is it suitable for agencies?',
];

export const enResponses: Record<string, string> = {
  'What is AdNexus AI?':
    'AdNexus AI is an intelligent campaign workspace. Our AI agent monitors your Meta, Google, TikTok, and Snap ad accounts 24/7, identifies issues, and generates optimization drafts. Nothing goes live without your approval.',
  'How do I start a free trial?':
    'Simply click the "Start Free Trial" button on the page. Setup takes 2 minutes. No credit card required, cancel anytime.',
  'Which platforms are supported?':
    'We currently support the four major platforms: Meta (Facebook/Instagram), Google Ads, TikTok Ads, and Snap Ads. More platforms coming soon.',
  'What are the pricing plans?':
    'We offer flat pricing that never scales with your ad spend:\n\n• Free: Basic features\n• Starter: $49/mo\n• Pro: $149/mo (most popular)\n• Enterprise: Custom',
  'How does AI draft approval work?':
    'After analyzing your ad data, the AI generates optimization suggestions as "drafts." You can review the detailed reasoning behind each suggestion, edit the numbers, then approve or reject with one click. All actions have a complete audit trail.',
  'Is it suitable for agencies?':
    'Absolutely! We support multi-client workspaces, team collaboration, white-label reporting, and scheduled reports. Agencies can easily manage multiple client ad accounts.',
};

export const enFallback =
  "Sorry, I can't answer that right now. You can contact our team for more details: hi@adnexus.ai";

export const enPlaceholders = {
  input: 'Type your question...',
  typing: 'AI is thinking...',
  send: 'Send',
};
