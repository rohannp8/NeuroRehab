interface SkeletonLoaderProps {
  className?: string
  count?: number
}

function SkeletonLine({ className = '' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-dark-hover rounded-lg ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
    </div>
  )
}

export default function SkeletonLoader({ className = '', count = 1 }: SkeletonLoaderProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonLine key={i} className="h-4 w-full" />
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center gap-3">
        <SkeletonLine className="h-12 w-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <SkeletonLine className="h-3 w-20" />
          <SkeletonLine className="h-6 w-32" />
        </div>
      </div>
    </div>
  )
}
