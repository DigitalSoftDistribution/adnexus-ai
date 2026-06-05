# AdNexus AI — Marketing Site v2 Revamp Plan

> **Version:** 2.0.0-draft  
> **Date:** 2026-06-05  
> **Status:** Design specification — ready for implementation  
> **Branch target:** `feat/marketing-site-2026-06-02` (existing) or new `feat/marketing-v2-revamp-2026-06-05`

---

## 1. Executive Summary

This plan defines a complete v2 revamp of the AdNexus AI marketing site, integrating:
- **Chat CN** (Chinese market expansion with localized chat interface)
- **Framer Motion** animations (already installed, fully leveraged)
- **New subpages** with rich, SEO-optimized content
- **Modern design system** evolution from current dark aesthetic

### Current State (Marketing Branch)
| Area | Status | Notes |
|------|--------|-------|
| Homepage | ✅ Strong | Hero, problem/solution, features, pricing, CTA |
| Subpages | ✅ 15+ pages | About, blog, changelog, comparisons, use-cases, features, legal |
| Framer Motion | ✅ Installed | Used in HomeContent, needs expansion |
| Chat CN | ❌ Missing | No Chinese localization or chat interface |
| Design System | 🟡 Good base | Dark theme, lime accent (`#c3f53b`), needs v2 polish |

### Target State
| Area | Target |
|------|--------|
| Homepage | Cinematic hero with scroll-driven animations, interactive demo |
| Chat CN | Full Chinese localization + AI chat widget on all marketing pages |
| Subpages | 8 new deep-dive pages with rich content, animations, SEO |
| Animations | Framer Motion on every section — scroll triggers, stagger, morph |
| Design | Glassmorphism cards, gradient orbs, micro-interactions |

---

## 2. Design System v2 Evolution

### 2.1 Color Palette (Evolved)

```css
/* Core tokens — extend existing, don't break */
--accent: #c3f53b;              /* Keep: signature lime */
--accent-glow: rgba(195,245,59,0.15);
--bg-primary: #050505;          /* Deeper black */
--bg-secondary: #0a0a0a;        /* Elevated surface */
--bg-elevated: #111111;         /* Card surface */
--bg-glass: rgba(17,17,17,0.7); /* Glassmorphism base */

/* New v2 additions */
--gradient-hero: linear-gradient(135deg, #c3f53b 0%, #2563EB 50%, #A78BFA 100%);
--gradient-card: linear-gradient(180deg, rgba(195,245,59,0.05) 0%, transparent 100%);
--glow-lime: 0 0 40px rgba(195,245,59,0.15);
--glow-blue: 0 0 40px rgba(37,99,235,0.15);

/* Chat CN accent (subtle red/gold for Chinese market) */
--chat-cn-accent: #E53935;
--chat-cn-gold: #FFB300;
```

### 2.2 Typography (Enhanced)

```css
/* Keep existing font-space for headings */
font-family: 'Space Grotesk', system-ui, sans-serif;

/* New: Add display weight for hero */
.hero-display {
  font-size: clamp(3rem, 8vw, 6rem);
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.03em;
}

/* Body text refinement */
.body-large {
  font-size: 1.125rem;
  line-height: 1.7;
  color: var(--text-secondary);
}
```

### 2.3 Animation Tokens (Framer Motion)

```typescript
// lib/marketing/animations.ts
export const easeSmooth = [0.4, 0, 0.2, 1] as const;
export const easeBounce = [0.34, 1.56, 0.64, 1] as const;
export const easeExpo = [0.16, 1, 0.3, 1] as const;

export const fadeInUp = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: easeSmooth }
};

export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } }
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.5, ease: easeBounce }
};

export const slideInLeft = {
  initial: { opacity: 0, x: -60 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.7, ease: easeExpo }
};

export const slideInRight = {
  initial: { opacity: 0, x: 60 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.7, ease: easeExpo }
};

export const glowPulse = {
  animate: {
    boxShadow: [
      '0 0 20px rgba(195,245,59,0.1)',
      '0 0 40px rgba(195,245,59,0.2)',
      '0 0 20px rgba(195,245,59,0.1)'
    ],
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' }
  }
};
```

---

## 3. Homepage v2 — Cinematic Experience

### 3.1 Hero Section (Redesigned)

**Current:** Static gradient background, CSS-animated dashboard mockup  
**v2:** Full scroll-driven cinematic experience

```typescript
// components/marketing/v2/HeroSection.tsx
'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

export function HeroSectionV2() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start']
  });

  const y = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  return (
    <section ref={ref} className="relative min-h-[100dvh] overflow-hidden">
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0"
        style={{ y, opacity }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(195,245,59,0.08)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(37,99,235,0.08)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-grid opacity-30" />
      </motion.div>

      {/* Floating orbs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(195,245,59,0.08), transparent 70%)',
          filter: 'blur(80px)'
        }}
        animate={{
          x: [0, 30, 0],
          y: [0, -20, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Content */}
      <motion.div
        className="relative z-10 max-w-7xl mx-auto px-6 pt-32"
        style={{ opacity, scale }}
      >
        {/* ... hero content with staggered animations ... */}
      </motion.div>
    </section>
  );
}
```

### 3.2 New Sections for Homepage

| Section | Animation | Content |
|---------|-----------|---------|
| **Hero** | Scroll-driven parallax, floating orbs | Headline + interactive dashboard preview |
| **Social Proof** | Staggered logo fade-in | Customer logos, stats counter |
| **Problem** | Slide-in cards | Pain points with animated icons |
| **Solution** | Morphing layout | 3 pillars with hover-expand cards |
| **Interactive Demo** | Scroll-triggered playback | Embedded product walkthrough |
| **Features Grid** | Staggered reveal | 8 features with micro-interactions |
| **Chat CN Preview** | Slide-up reveal | Chinese market AI chat teaser |
| **Pricing** | Bounce-in cards | 4 tiers with glow effects |
| **Final CTA** | Pulse animation | Gradient CTA band |

---

## 4. Chat CN Integration

### 4.1 Architecture

```
┌─────────────────────────────────────────┐
│         Marketing Page (Next.js)        │
│  ┌─────────────────────────────────┐    │
│  │      ChatWidget (Floating)      │    │
│  │  ┌─────────────────────────┐    │    │
│  │  │   ChatWindow (Expand)   │    │    │
│  │  │  ┌─────────────────┐    │    │    │
│  │  │  │  MessageList    │    │    │    │
│  │  │  │  ┌───────────┐  │    │    │    │
│  │  │  │  │ AI Bubble │  │    │    │    │
│  │  │  │  │ User Msg  │  │    │    │    │
│  │  │  │  │ Suggested │  │    │    │    │
│  │  │  │  └───────────┘  │    │    │    │
│  │  │  └─────────────────┘    │    │    │
│  │  │  ┌─────────────────┐    │    │    │
│  │  │  │   Input Area    │    │    │    │
│  │  │  │  [Type...] [Send]│   │    │    │
│  │  │  └─────────────────┘    │    │    │
│  │  └─────────────────────────┘    │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### 4.2 Component Structure

```typescript
// components/marketing/chat/ChatWidget.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && <ChatWindow onClose={() => setIsOpen(false)} />}
      </AnimatePresence>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{ background: '#c3f53b' }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        animate={{
          boxShadow: [
            '0 0 0 0 rgba(195,245,59,0.4)',
            '0 0 0 20px rgba(195,245,59,0)'
          ]
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {isOpen ? <X size={24} color="#0a0a0a" /> : <MessageCircle size={24} color="#0a0a0a" />}
      </motion.button>
    </div>
  );
}

// components/marketing/chat/ChatWindow.tsx
// - Message bubbles with Framer Motion stagger
// - Typing indicator animation
// - Suggested questions chips
// - Language toggle (EN / 中文)
```

### 4.3 Chinese Localization

```typescript
// lib/marketing/chat/cn-messages.ts
export const cnMessages = {
  greeting: '您好！我是 AdNexus AI 助手。我可以帮您了解我们的 AI 广告管理平台。',
  suggestions: [
    'AdNexus AI 是什么？',
    '如何开始免费试用？',
    '支持哪些广告平台？',
    '定价方案有哪些？',
    'AI 草稿审批如何工作？'
  ],
  responses: {
    whatIs: 'AdNexus AI 是一个智能广告活动工作区...',
    platforms: '我们支持 Meta、Google、TikTok 和 Snap...',
    pricing: '我们提供扁平定价，不按广告支出比例收费...'
  }
};
```

---

## 5. New Subpages (v2)

### 5.1 Page Inventory

| Route | Type | Content | Priority |
|-------|------|---------|----------|
| `/` | Home | Cinematic hero + all sections | P0 |
| `/features` | Hub | Feature overview with interactive cards | P0 |
| `/features/ai-agent` | Deep-dive | AI agent capabilities, demo video | P0 |
| `/features/approvals` | Deep-dive | Draft approval workflow, security | P0 |
| `/features/platforms` | Deep-dive | 4-platform integration details | P0 |
| `/features/creative-fatigue` | **NEW** | Creative detection & replacement | P1 |
| `/features/morning-brief` | **NEW** | Daily AI summary feature | P1 |
| `/features/budget-pacing` | **NEW** | Smart budget allocation | P1 |
| `/use-cases` | Hub | Industry solutions overview | P0 |
| `/use-cases/agencies` | Deep-dive | Agency workflow, multi-client | P0 |
| `/use-cases/ecommerce` | Deep-dive | ROAS protection, funnel optimization | P0 |
| `/use-cases/in-house` | Deep-dive | Team collaboration, approvals | P0 |
| `/use-cases/startups` | **NEW** | Early-stage growth teams | P1 |
| `/compare` | Hub | Comparison overview | P0 |
| `/compare/pipeboard` | Comparison | vs Pipeboard | P0 |
| `/compare/madgicx` | Comparison | vs Madgicx | P0 |
| `/compare/smartly` | Comparison | vs Smartly.io | P0 |
| `/compare/revealbot` | Comparison | vs Revealbot | P0 |
| `/compare/adkit` | Comparison | vs AdKit | P0 |
| `/pricing` | Core | Pricing tiers, FAQ, calculator | P0 |
| `/about` | Core | Company story, team, values | P0 |
| `/blog` | Content | Blog listing with search/filter | P0 |
| `/blog/[slug]` | Content | Individual blog post | P0 |
| `/changelog` | Content | Product updates timeline | P0 |
| `/security` | Trust | Security practices, compliance | P0 |
| `/faq` | Support | Common questions accordion | P0 |
| `/contact` | Support | Contact form + chat | P0 |
| `/integrations` | Deep-dive | Platform connections, MCP | P0 |
| `/tools/roas-calculator` | Tool | Interactive ROAS calculator | P0 |
| `/tools/creative-fatigue` | **NEW** | Creative fatigue detector | P1 |
| `/legal/privacy` | Legal | Privacy policy | P0 |
| `/legal/terms` | Legal | Terms of service | P0 |
| `/legal/dpa` | Legal | DPA | P0 |
| `/legal/cookies` | Legal | Cookie policy | P0 |

### 5.2 New Page: Creative Fatigue (`/features/creative-fatigue`)

```typescript
// app/[locale]/(marketing)/features/creative-fatigue/page.tsx
import type { Metadata } from 'next';
import { PageHero, Section, FeatureCard, CtaBand } from '@/components/marketing/sections';
import { CreativeFatigueDemo } from '@/components/marketing/v2/CreativeFatigueDemo';

export const metadata: Metadata = {
  title: 'Creative Fatigue Detection — AdNexus AI',
  description: 'AI detects when ad creative performance drops, alerts you, and suggests replacements before budget is wasted.',
};

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Feature"
        title={<>Catch tired creative <span style={{ color: '#c3f53b' }}>before it burns budget</span></>}
        subtitle="AdNexus AI monitors every creative across all platforms and flags fatigue the moment performance drops."
      />
      
      <Section title="How it works">
        <CreativeFatigueDemo />
      </Section>
      
      <Section title="What you get" alt>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            icon={<AlertIcon />}
            title="Early warning"
            desc="Get alerted when CTR drops 15% or conversion rate falls below your baseline."
          />
          <FeatureCard
            icon={<RefreshIcon />}
            title="Smart suggestions"
            desc="AI recommends which creative to replace and generates new variants to test."
          />
          <FeatureCard
            icon={<ChartIcon />}
            title="Cross-platform view"
            desc="See fatigue patterns across Meta, Google, TikTok, and Snap in one dashboard."
          />
        </div>
      </Section>
      
      <CtaBand />
    </>
  );
}
```

### 5.3 New Page: Morning Brief (`/features/morning-brief`)

```typescript
// app/[locale]/(marketing)/features/morning-brief/page.tsx
// - Interactive demo of daily AI summary
// - Sample brief with animated reveal
// - Feature breakdown cards
```

### 5.4 New Page: Budget Pacing (`/features/budget-pacing`)

```typescript
// app/[locale]/(marketing)/features/budget-pacing/page.tsx
// - Interactive budget allocator demo
// - Visual spend pacing chart
// - Platform comparison
```

---

## 6. Framer Motion Implementation Plan

### 6.1 Global Animations

```typescript
// components/marketing/v2/animations/index.ts

export { ScrollReveal } from './ScrollReveal';
export { StaggerChildren } from './StaggerChildren';
export { ParallaxSection } from './ParallaxSection';
export { MagneticButton } from './MagneticButton';
export { TextReveal } from './TextReveal';
export { CounterAnimation } from './CounterAnimation';
export { GradientOrb } from './GradientOrb';
```

### 6.2 ScrollReveal Component

```typescript
// components/marketing/v2/animations/ScrollReveal.tsx
'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, ReactNode } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
  duration?: number;
  className?: string;
}

export function ScrollReveal({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.6,
  className = ''
}: ScrollRevealProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const directions = {
    up: { y: 40, x: 0 },
    down: { y: -40, x: 0 },
    left: { y: 0, x: -40 },
    right: { y: 0, x: 40 }
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...directions[direction] }}
      animate={isInView ? { opacity: 1, y: 0, x: 0 } : {}}
      transition={{ duration, delay, ease: [0.4, 0, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

### 6.3 Magnetic Button

```typescript
// components/marketing/v2/animations/MagneticButton.tsx
'use client';

import { motion } from 'framer-motion';
import { useRef, ReactNode } from 'react';

export function MagneticButton({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    ref.current.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
  };

  const handleMouseLeave = () => {
    if (!ref.current) return;
    ref.current.style.transform = 'translate(0, 0)';
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      transition={{ type: 'spring', stiffness: 150, damping: 15 }}
    >
      {children}
    </motion.div>
  );
}
```

### 6.4 Text Reveal Animation

```typescript
// components/marketing/v2/animations/TextReveal.tsx
'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

export function TextReveal({ text, className = '' }: { text: string; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const words = text.split(' ');

  return (
    <span ref={ref} className={className}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block mr-[0.25em]"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, delay: i * 0.05, ease: [0.4, 0, 0.2, 1] }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}
```

---

## 7. File Structure

```
apps/web/
├── app/[locale]/(marketing)/
│   ├── page.tsx                          # Homepage v2
│   ├── layout.tsx                        # Marketing layout (add ChatWidget)
│   ├── marketing.css                     # Extended v2 styles
│   ├── features/
│   │   ├── page.tsx                      # Features hub
│   │   ├── ai-agent/
│   │   ├── approvals/
│   │   ├── platforms/
│   │   ├── creative-fatigue/             # NEW
│   │   ├── morning-brief/                # NEW
│   │   └── budget-pacing/                # NEW
│   ├── use-cases/
│   │   ├── page.tsx
│   │   ├── agencies/
│   │   ├── ecommerce/
│   │   ├── in-house/
│   │   └── startups/                     # NEW
│   ├── compare/
│   ├── pricing/
│   ├── about/
│   ├── blog/
│   ├── changelog/
│   ├── security/
│   ├── faq/
│   ├── contact/
│   ├── integrations/
│   ├── tools/
│   │   ├── roas-calculator/
│   │   └── creative-fatigue/             # NEW
│   └── legal/
│
├── components/marketing/
│   ├── HomeContent.tsx                   # Update with v2 sections
│   ├── MarketingHeader.tsx               # Add Chat toggle
│   ├── MarketingFooter.tsx               # Add CN links
│   ├── sections.tsx                      # Extend with new components
│   │
│   ├── v2/                               # NEW: v2 components
│   │   ├── HeroSection.tsx
│   │   ├── SocialProofSection.tsx
│   │   ├── InteractiveDemoSection.tsx
│   │   ├── ChatCNSection.tsx
│   │   ├── FeatureShowcase.tsx
│   │   ├── PricingCards.tsx
│   │   │
│   │   ├── animations/
│   │   │   ├── ScrollReveal.tsx
│   │   │   ├── StaggerChildren.tsx
│   │   │   ├── ParallaxSection.tsx
│   │   │   ├── MagneticButton.tsx
│   │   │   ├── TextReveal.tsx
│   │   │   ├── CounterAnimation.tsx
│   │   │   └── GradientOrb.tsx
│   │   │
│   │   ├── demos/
│   │   │   ├── CreativeFatigueDemo.tsx
│   │   │   ├── MorningBriefDemo.tsx
│   │   │   └── BudgetPacingDemo.tsx
│   │   │
│   │   └── chat/
│   │       ├── ChatWidget.tsx
│   │       ├── ChatWindow.tsx
│   │       ├── MessageBubble.tsx
│   │       ├── TypingIndicator.tsx
│   │       ├── SuggestedQuestions.tsx
│   │       └── LanguageToggle.tsx
│   │
│   └── chat/
│       └── cn-messages.ts                # Chinese chat content
│
├── lib/marketing/
│   ├── animations.ts                     # Animation constants
│   ├── nav.ts                            # Update nav for new pages
│   ├── pricing.ts                        # Keep existing
│   └── chat/
│       └── cn-messages.ts
│
└── hooks/
    └── useScrollAnimation.ts             # Extend for v2
```

---

## 8. Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create `feat/marketing-v2-revamp` branch
- [ ] Set up v2 component directory structure
- [ ] Create animation utilities (`lib/marketing/animations.ts`)
- [ ] Build core animation components (ScrollReveal, StaggerChildren)
- [ ] Update marketing layout with ChatWidget

### Phase 2: Homepage v2 (Week 1-2)
- [ ] Redesign HeroSection with scroll-driven parallax
- [ ] Add floating gradient orbs
- [ ] Implement TextReveal for headlines
- [ ] Add SocialProof section with counter animations
- [ ] Enhance existing sections with new animations
- [ ] Add InteractiveDemo section

### Phase 3: Chat CN (Week 2)
- [ ] Build ChatWidget floating button
- [ ] Build ChatWindow with message list
- [ ] Add typing indicator animation
- [ ] Create Chinese message content
- [ ] Add language toggle (EN/中文)
- [ ] Integrate with all marketing pages

### Phase 4: New Subpages (Week 2-3)
- [ ] `/features/creative-fatigue` with interactive demo
- [ ] `/features/morning-brief` with sample brief
- [ ] `/features/budget-pacing` with allocator demo
- [ ] `/use-cases/startups` with startup-specific content
- [ ] `/tools/creative-fatigue` calculator tool

### Phase 5: Polish & QA (Week 3)
- [ ] Add MagneticButton to all CTAs
- [ ] Implement GradientOrb backgrounds
- [ ] Add hover micro-interactions to cards
- [ ] Test all animations on mobile
- [ ] Performance audit (Lighthouse)
- [ ] Accessibility audit
- [ ] `beast typecheck && beast lint && beast build`

### Phase 6: Content & SEO (Week 3-4)
- [ ] Write rich content for all new pages
- [ ] Add JSON-LD structured data
- [ ] Update sitemap
- [ ] Add meta descriptions
- [ ] Create OG images for new pages

---

## 9. Dependencies

### Already Installed
- `framer-motion` ^12.39.0 ✅
- `lucide-react` ^0.562.0 ✅
- `next-intl` ^4.13.0 ✅
- `tailwindcss` ^3.4.19 ✅

### To Add
```bash
# Chinese text handling (if needed)
pnpm add -D @types/node

# Optional: Enhanced animation libraries
# pnpm add gsap @gsap/react  # For complex scroll animations
# pnpm add react-countup      # For animated counters (already installed)
```

---

## 10. Performance Considerations

| Concern | Solution |
|---------|----------|
| Bundle size | Lazy load ChatWidget, demo components |
| Animation jank | Use `will-change`, `transform` only, `layout` sparingly |
| Mobile performance | Reduce particle count, simplify orbs on mobile |
| LCP | Preload hero image, inline critical CSS |
| CLS | Reserve space for animated elements |

```typescript
// Lazy load heavy components
const ChatWidget = dynamic(() => import('@/components/marketing/v2/chat/ChatWidget'), {
  ssr: false,
  loading: () => null
});

const InteractiveDemo = dynamic(() => import('@/components/marketing/v2/demos/InteractiveDemo'), {
  ssr: false
});
```

---

## 11. Accessibility

```typescript
// Respect prefers-reduced-motion
const prefersReducedMotion = typeof window !== 'undefined' 
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
  : false;

// In components:
<motion.div
  animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
  // ...
/>
```

---

## 12. Acceptance Criteria

- [ ] Homepage has scroll-driven parallax hero with floating orbs
- [ ] All sections use Framer Motion scroll-triggered animations
- [ ] Chat widget is present on all marketing pages
- [ ] Chinese language support works in chat
- [ ] 4 new subpages are live with rich content
- [ ] All animations respect `prefers-reduced-motion`
- [ ] Lighthouse score > 90 on all pages
- [ ] `beast typecheck` passes
- [ ] `beast lint` passes
- [ ] `beast build` passes
- [ ] Mobile experience is smooth (60fps)

---

*This plan aligns with Linear roadmap milestone "v2 Growth and Multi-Channel" (SB-3066) and supports the v1 launch foundation by creating a compelling marketing presence.*
