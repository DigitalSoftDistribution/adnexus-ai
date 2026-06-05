'use client';

import { useState, useMemo } from 'react';
import { Link } from '@/i18n/navigation';
import {
  Search,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Sparkles,
  TrendingUp,
  Briefcase,
  Lightbulb,
} from 'lucide-react';
import { BLOG_POSTS } from '@/lib/marketing/blog-posts';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FadeIn } from './v3/animations';

const categories = ['All', 'Product', 'AI', 'Case Studies', 'Tips'] as const;
type Category = (typeof categories)[number];

const categoryMeta: Record<string, { icon: typeof BookOpen; color: string }> = {
  All: { icon: BookOpen, color: 'text-foreground' },
  Product: { icon: Sparkles, color: 'text-primary' },
  AI: { icon: TrendingUp, color: 'text-accent' },
  'Case Studies': { icon: Briefcase, color: 'text-success' },
  Tips: { icon: Lightbulb, color: 'text-warning' },
};

const posts = BLOG_POSTS;
const POSTS_PER_PAGE = 6;

export function BlogContent() {
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredPosts = useMemo(() => {
    let result = posts;
    if (activeCategory !== 'All') {
      result = result.filter((p) => p.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q) ||
          p.author.toLowerCase().includes(q)
      );
    }
    return result;
  }, [activeCategory, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );

  const featuredPost = filteredPosts[0];
  const gridPosts =
    currentPage === 1 && !searchQuery && activeCategory === 'All'
      ? paginatedPosts.slice(1)
      : paginatedPosts;

  const handleCategoryChange = (cat: Category) => {
    setActiveCategory(cat);
    setCurrentPage(1);
  };

  return (
    <div>
      {/* Hero */}
      <section className="pt-28 pb-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <FadeIn>
            <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-tight text-foreground mb-4">
              Blog
            </h1>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Insights, product updates, and strategies for modern advertising teams.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Search + filters */}
      <section className="pb-10 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative mb-6">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const Icon = categoryMeta[cat].icon;
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon size={12} />
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured post */}
      {featuredPost && currentPage === 1 && !searchQuery && activeCategory === 'All' && (
        <section className="pb-10 px-6">
          <div className="max-w-4xl mx-auto">
            <FadeIn>
              <Link href={`/blog/${featuredPost.slug}`} className="block group">
                <Card className="overflow-hidden border-border/60 hover:border-primary/40 transition-colors">
                  <div className="grid md:grid-cols-2">
                    <div className="aspect-video md:aspect-auto bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground text-sm">Featured image</span>
                    </div>
                    <CardContent className="p-6 md:p-8 flex flex-col justify-center">
                      <Badge variant="secondary" className="w-fit mb-3">
                        {featuredPost.category}
                      </Badge>
                      <h2 className="text-xl md:text-2xl font-semibold text-foreground group-hover:text-primary transition-colors mb-3">
                        {featuredPost.title}
                      </h2>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                        {featuredPost.excerpt}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{featuredPost.author}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {featuredPost.readTime}
                        </span>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              </Link>
            </FadeIn>
          </div>
        </section>
      )}

      {/* Grid */}
      <section className="pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          {gridPosts.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {gridPosts.map((post, i) => (
                <FadeIn key={post.slug} delay={i * 0.05}>
                  <Link href={`/blog/${post.slug}`} className="block group h-full">
                    <Card className="h-full border-border/60 hover:border-primary/40 transition-colors">
                      <CardHeader>
                        <Badge variant="secondary" className="w-fit">
                          {post.category}
                        </Badge>
                        <CardTitle className="text-base group-hover:text-primary transition-colors">
                          {post.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {post.excerpt}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{post.author}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {post.readTime}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </FadeIn>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground">No posts found.</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={page === currentPage ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
