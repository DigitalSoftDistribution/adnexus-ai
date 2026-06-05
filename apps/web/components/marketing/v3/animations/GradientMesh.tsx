'use client';

export function GradientMesh() {
  return (
    <div className="gradient-mesh" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 30% 20%, rgba(99, 102, 241, 0.06) 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(139, 92, 246, 0.04) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(99, 102, 241, 0.03) 0%, transparent 50%)',
          animation: 'mesh-drift 20s ease-in-out infinite',
        }}
      />
    </div>
  );
}
