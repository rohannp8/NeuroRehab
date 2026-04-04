import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface MetricCardProps {
  icon: ReactNode
  label: string
  value: string | number
  trend?: { value: number; positive: boolean }
  bgColor?: string
}

export default function MetricCard({ icon, label, value, trend, bgColor = 'bg-pastel-peach' }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${bgColor} rounded-2xl p-5 transition-all duration-300 hover:shadow-card cursor-default`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2.5 rounded-xl bg-white/60 backdrop-blur-sm">
          {icon}
        </div>
        {trend && (
          <span className={`text-xs font-semibold flex items-center gap-1 px-2 py-1 rounded-full ${
            trend.positive ? 'bg-success-light text-success-dark' : 'bg-danger-light text-danger-dark'
          }`}>
            {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <p className="text-text-muted text-xs font-medium mb-0.5">{label}</p>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
    </motion.div>
  )
}
