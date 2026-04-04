import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  mockROMData, mockCognitiveData, mockRepQuality, mockSessionHeatmap,
} from '../mockData'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, RadialBarChart, RadialBar,
} from 'recharts'
import {
  BarChart3, Download, TrendingUp, Brain, Calendar, Activity,
  Target, Loader2,
} from 'lucide-react'

const tooltipStyle = {
  backgroundColor: '#1C2333',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  color: '#E6EDF3',
}

export default function Analytics() {
  const [selectedJoint, setSelectedJoint] = useState('shoulder')
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    // TODO: Call exportPDF() API
    await new Promise((r) => setTimeout(r, 2000))
    setExporting(false)
    alert('PDF report downloaded!')
  }

  const recoveryData = [
    { name: 'Recovery', value: 68, fill: '#00E5A0' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-accent" />
            Analytics
          </h1>
          <p className="text-text-muted mt-1">Track your recovery progress in detail</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="btn-primary flex items-center gap-2"
        >
          {exporting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Download className="w-5 h-5" />
          )}
          Export PDF Report
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Joint ROM over time */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              Joint ROM Over Time
            </h3>
            <select
              value={selectedJoint}
              onChange={(e) => setSelectedJoint(e.target.value)}
              className="input-field w-auto py-1.5 px-3 text-sm"
            >
              <option value="shoulder">Shoulder</option>
              <option value="elbow">Elbow</option>
              <option value="knee">Knee</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={mockROMData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1C2333" />
              <XAxis dataKey="date" stroke="#8B949E" fontSize={12} />
              <YAxis stroke="#8B949E" fontSize={12} unit="°" />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey={selectedJoint}
                stroke="#00E5A0"
                strokeWidth={3}
                dot={{ fill: '#00E5A0', r: 5 }}
                activeDot={{ r: 7, stroke: '#00E5A0', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Rep Quality */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-warn" />
            Rep Quality by Exercise
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={mockRepQuality}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1C2333" />
              <XAxis dataKey="exercise" stroke="#8B949E" fontSize={11} />
              <YAxis stroke="#8B949E" fontSize={12} unit="%" domain={[0, 100]} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="quality" fill="#00E5A0" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cognitive Trajectory */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-purple-400" />
            Cognitive Score Trajectory
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={mockCognitiveData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1C2333" />
              <XAxis dataKey="date" stroke="#8B949E" fontSize={12} />
              <YAxis stroke="#8B949E" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line type="monotone" dataKey="accuracy" stroke="#A78BFA" strokeWidth={2} dot={{ r: 4, fill: '#A78BFA' }} name="Accuracy %" />
              <Line type="monotone" dataKey="responseTime" stroke="#FFB347" strokeWidth={2} dot={{ r: 4, fill: '#FFB347' }} name="Response (ms)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Session Heatmap */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-accent" />
            Session Activity Heatmap
          </h3>
          <div className="grid grid-cols-13 gap-1">
            {mockSessionHeatmap.slice(-91).map((day, i) => {
              const intensityMap = ['bg-dark-hover', 'bg-accent/20', 'bg-accent/40', 'bg-accent/60', 'bg-accent/80', 'bg-accent']
              return (
                <div
                  key={i}
                  className={`w-full aspect-square rounded-sm ${intensityMap[Math.min(day.count, 5)]} transition-colors`}
                  title={`${day.date}: ${day.count} sessions`}
                />
              )
            })}
          </div>
          <div className="flex items-center justify-end gap-2 mt-3 text-xs text-text-dim">
            <span>Less</span>
            {['bg-dark-hover', 'bg-accent/20', 'bg-accent/40', 'bg-accent/60', 'bg-accent'].map((cls, i) => (
              <div key={i} className={`w-3 h-3 rounded-sm ${cls}`} />
            ))}
            <span>More</span>
          </div>
        </div>

        {/* Recovery Index */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-accent" />
            Recovery Index
          </h3>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width={250} height={250}>
              <RadialBarChart
                innerRadius="70%"
                outerRadius="100%"
                data={recoveryData}
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar
                  dataKey="value"
                  cornerRadius={10}
                  background={{ fill: '#1C2333' }}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute text-center">
              <p className="text-4xl font-bold text-accent">68%</p>
              <p className="text-sm text-text-muted">Recovery</p>
            </div>
          </div>
        </div>

        {/* Predicted Recovery */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            Recovery Milestones
          </h3>
          <div className="space-y-4">
            {[
              { milestone: '50% ROM Recovery', date: 'Mar 15, 2026', done: true },
              { milestone: '75% ROM Recovery', date: 'Apr 20, 2026', done: false },
              { milestone: 'Full Range of Motion', date: 'Jun 01, 2026', done: false },
              { milestone: 'Return to Activity', date: 'Jul 15, 2026', done: false },
            ].map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-4"
              >
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                  m.done ? 'bg-accent border-accent' : 'border-dark-border'
                }`} />
                <div className={`flex-1 ${i < 3 ? 'border-l-2 border-dark-border ml-[7px] pl-7 pb-4 -mt-1' : 'ml-[7px] pl-7'}`}>
                  <p className={`font-medium ${m.done ? 'text-accent' : 'text-text-primary'}`}>{m.milestone}</p>
                  <p className="text-xs text-text-dim">{m.date}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
