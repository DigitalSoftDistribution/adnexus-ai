'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Section } from './sections';
import { FadeIn, StaggerContainer, StaggerItem } from './v3/animations';

const POSTS = [
  {
    title: 'How AI is Transforming Digital Advertising in 2026',
    excerpt: 'From autonomous optimization to predictive analytics, explore how AI is reshaping the advertising landscape.',
    category: 'AI',
    date: 'Jun 1, 2026',
    href: '/blog/ai-transforming-advertising',
    featured: true,
  },
  {
    title: 'Cross-Platform Attribution: The Complete Guide',
    excerpt: 'Understanding the true impact of your campaigns across Meta, Google, TikTok, and Snap.',
    category: 'Analytics',
    date: 'May 28, 2026',
    href: '/blog/cross-platform-attribution',
    featured: false,
  },
  {
    title: 'Creative Fatigue: Detect It Before It Costs You',
    excerpt: 'Learn the early warning signs of ad fatigue and how to keep your creatives performing.',
    category: 'Creative',
    date: 'May 20, 2026',
    href: '/blog/creative-fatigue-detection',
    featured: false,
  },
  {
    title: 'Budget Pacing Strategies for Maximum ROAS',
    excerpt: 'Smart allocation techniques to get the most out of every dollar spent.',
    category: 'Strategy',
    date: 'May 15, 2026',
    href: '/blog/budget-pacing-strategies',
    featured: false,
  },
  {
    title: 'The Morning Brief: A New Way to Start Your Day',
    excerpt: 'How automated daily digests are saving marketing teams hours every week.',
    category: 'Product',
    date: 'May 10, 2026',
    href: '/blog/morning-brief',
    featured: false,
  },
  {
    title: 'Building an AI-First Marketing Team',
    excerpt: 'Hiring, tooling, and processes for teams that leverage AI at every stage.',
    category: 'Team',
    date: 'May 5, 2026',
    href: '/blog/ai-first-marketing-team',
    featured: false,
  },
];

const CATEGORY_COLORS: Record<string, 'teal' | 'violet' | 'default'> = {
  AI: 'teal',
  Analytics: 'violet',
  Creative: 'teal',
  Strategy: 'violet',
  Product: 'teal',
  Team: 'violet',
};

export function BlogContent() {
  const [query, setQuery] = useState('');

  const filtered = POSTS.filter(
    (p) =>
      p.title.toLowerCase().includes(query.toLowerCase()) ||
      p.excerpt.toLowerCase().includes(query.toLowerCase()) ||
      p.category.toLowerCase().includes(query.toLowerCase())
  );

  const featured = filtered.find((p) => p.featured);
  const rest = filtered.filter((p) => !p.featured);

  return (
    <>
      <Section className="pt-24">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <FadeIn>
            <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
              Blog
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Insights, strategies, and product updates from the AdNexus team.
            </p>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="mt-8 relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="Search articles..."
                className="pl-10"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </FadeIn>
        </div>

        {featured && (
          <FadeIn className="max-w-4xl mx-auto mb-12">
            <Link href={featured.href} className="block group">
              <Card className="overflow-hidden hover:border-primary/30 transition-all">
                <div className="grid md:grid-cols-2">
                  <div className="bg-secondary/50 h-48 md:h-auto flex items-center justify-center">
                    <span className="text-4xl font-display font-bold text-muted-foreground/30">
                      Featured
                    </span>
                  </div>
                  <div className="p-6 md:p-8 flex flex-col justify-center">
                    <Badge variant={CATEGORY_COLORS[featured.category] || 'default'} className="w-fit mb-3">
                      {featured.category}
                    </Badge>
                    <CardTitle className="text-xl md:text-2xl group-hover:text-primary transition-colors">
                      {featured.title}
                    </CardTitle>
                    <CardDescription className="mt-3 text-base">{featured.excerpt}</CardDescription>
                    <p className="mt-4 text-xs text-muted-foreground">{featured.date}</p>
                  </div>
                </div>
              </Card>
            </Link>
          </FadeIn>
        )}

        <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {rest.map((post) => (
            <StaggerItem key={post.href}>
              <Link href={post.href} className="block group h-full">
                <Card className="h-full hover:border-primary/30 transition-all">
                  <CardHeader>
                    <Badge variant={CATEGORY_COLORS[post.category] || 'default'} className="w-fit mb-2">
                      {post.category}
                    </Badge>
                    <CardTitle className="text-base group-hover:text-primary transition-colors">
                      {post.title}
                    </CardTitle>
                    <CardDescription>{post.excerpt}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground">{post.date}</p>
                  </CardContent>
                </Card>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </Section>
    </>
  );
}
