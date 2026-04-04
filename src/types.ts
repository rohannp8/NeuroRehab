export interface UserProfile {
  user_id: string
  name: string
  email: string
  language_code: string
  condition_id: string
  fitness_level: 'Low' | 'Med' | 'High'
  xp_total: number
  rank_global: number
  twin_state: { last_calibrated_at: string; joint_baselines: Record<string, number> } | null
}

export interface Exercise {
  id: string
  name: string
  condition_ids: string[]
  primary_joints: string[]
  target_rom_min: number
  target_rom_max: number
  default_reps: number
  difficulty: 1 | 2 | 3
  description: string
}

export interface JointAngle {
  joint: string
  angle: number
  target_min: number
  target_max: number
  deviation_score: number
  color: 'green' | 'yellow' | 'red'
}

export interface PoseFrame {
  landmarks: { x: number; y: number; z: number; visibility: number }[]
  joint_angles: JointAngle[]
  rep_count: number
  quality_score: number
  rendered_frame?: string
}

export type GameType =
  | 'sequence_recall' | 'pattern_matrix' | 'delayed_word_recall'
  | 'number_span' | 'go_no_go' | 'spatial_memory_grid' | 'color_word_stroop'

export interface LeaderboardEntry {
  rank: number
  display_name: string
  condition_id: string
  country_code: string
  xp_total: number
  current_streak: number
  is_current_user: boolean
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
  date_of_birth: string
  biological_sex: 'M' | 'F' | 'Other'
  language_code: string
  condition_id: string
  fitness_level: 'Low' | 'Med' | 'High'
  injury_onset_date: string
  notification_time: string
}

export interface EndSessionPayload {
  quality_score: number
  exercises_json: object
  xp_earned: number
}

export interface TrialResult {
  game_type: GameType
  accuracy: boolean
  response_ms: number
}
