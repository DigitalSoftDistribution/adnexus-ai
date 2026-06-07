'use client';

import { cn } from '@/lib/utils';

export function LivingMockup({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative rounded-xl border border-border bg-card overflow-hidden shadow-2xl',
        className
      )}
    >
      {/* Mockup header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/50">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-destructive/60" />
          <span className="w-3 h-3 rounded-full bg-warning/60" />
          <span className="w-3 h-3 rounded-full bg-success/60" />
        </div>
        <div className="flex-1 mx-4">
          <div className="h-5 rounded-md bg-border/60 max-w-md mx-auto" />
        </div>
      </div>

      {/* Mockup body */}
      <div className="p-6 grid grid-cols-12 gap-4">
        {/* Sidebar */}
        <div className="col-span-3 space-y-3">
          <div className="h-8 rounded-md bg-primary/20 w-full animate-pulse" />
          <div className="h-6 rounded-md bg-border/40 w-3/4" />
          <div className="h-6 rounded-md bg-border/40 w-5/6" />
          <div className="h-6 rounded-md bg-border/40 w-2/3" />
          <div className="h-6 rounded-md bg-border/40 w-4/5" />
        </div>

        {/* Main content */}
        <div className="col-span-9 space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <div className="h-3 rounded bg-border/40 w-16 mb-2" />
                <div className="h-6 rounded bg-primary/20 w-20 animate-pulse" />
              </div>
            ))}
          </div>

          {/* Chart area */}
          <div className="rounded-lg border border-border p-4 h-40 relative overflow-hidden">
            <div className="h-3 rounded bg-border/40 w-24 mb-4" />
            <div className="absolute bottom-4 left-4 right-4 h-20 flex items-end gap-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm bg-primary/30 animate-pulse"
                  style={{
                    height: `${20 + Math.random() * 60}%`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="grid grid-cols-4 gap-4 p-3 border-b border-border bg-secondary/30">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-3 rounded bg-border/40" />
              ))}
            </div>
            {Array.from({ length: 3 }).map((_, row) => (
              <div key={row} className="grid grid-cols-4 gap-4 p-3 border-b border-border/50">
                <div className="h-3 rounded bg-border/30 w-20" />
                <div className="h-3 rounded bg-primary/20 w-16 animate-pulse" />
                <div className="h-3 rounded bg-border/30 w-12" />
                <div className="h-3 rounded bg-border/30 w-14" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
