// Minimal mock data for frontend demo — replace with real API calls when backend is ready

import type { UserProfile, Exercise, LeaderboardEntry } from './types'

export const mockUser: UserProfile = {
  user_id: 'u-demo-001',
  name: 'Aakanksha',
  email: 'aakanksha@example.com',
  language_code: 'en',
  condition_id: 'stroke',
  fitness_level: 'Med',
  xp_total: 2450,
  rank_global: 42,
  twin_state: null,
}

export const mockExercises: Exercise[] = [
  { id: 'ex-1', name: 'Finger Tapping', condition_ids: ['stroke', 'parkinsons', 'carpal_tunnel'], primary_joints: ['fingers'], target_rom_min: 0, target_rom_max: 1, default_reps: 20, difficulty: 1, description: 'Tap thumb to index finger repeatedly at a steady pace.' },
  { id: 'ex-4', name: 'Fist Stretch', condition_ids: ['stroke', 'parkinsons', 'carpal_tunnel'], primary_joints: ['fingers'], target_rom_min: 1.4, target_rom_max: 2.8, default_reps: 15, difficulty: 1, description: 'Open your hand fully, then close into a fist with control.' },
  { id: 'ex-2', name: 'Arm Extension', condition_ids: ['stroke', 'fracture_elbow', 'frozen_shoulder'], primary_joints: ['elbow'], target_rom_min: 20, target_rom_max: 165, default_reps: 12, difficulty: 1, description: 'Extend your arm from bent to straight and return with control.' },
  { id: 'ex-3', name: 'Wrist Flexion', condition_ids: ['stroke', 'carpal_tunnel'], primary_joints: ['wrist'], target_rom_min: 10, target_rom_max: 70, default_reps: 15, difficulty: 1, description: 'Bend your wrist forward and back through a comfortable range.' },
]

export const mockLeaderboard: LeaderboardEntry[] = [
  { rank: 1, display_name: 'Rajesh K.', condition_id: 'stroke', country_code: 'IN', xp_total: 8920, current_streak: 45, is_current_user: false },
  { rank: 2, display_name: 'Priya S.', condition_id: 'acl_rehab', country_code: 'IN', xp_total: 7650, current_streak: 38, is_current_user: false },
  { rank: 3, display_name: 'Michael C.', condition_id: 'stroke', country_code: 'US', xp_total: 7200, current_streak: 30, is_current_user: false },
  { rank: 4, display_name: 'Nina T.', condition_id: 'frozen_shoulder', country_code: 'UK', xp_total: 6100, current_streak: 22, is_current_user: false },
  { rank: 5, display_name: 'Arjun M.', condition_id: 'stroke', country_code: 'IN', xp_total: 5800, current_streak: 19, is_current_user: false },
  { rank: 42, display_name: 'Aakanksha S.', condition_id: 'stroke', country_code: 'IN', xp_total: 2450, current_streak: 7, is_current_user: true },
]

export const mockROMData = [
  { date: 'Mar 28', shoulder: 110, elbow: 120, knee: 95 },
  { date: 'Mar 29', shoulder: 115, elbow: 122, knee: 100 },
  { date: 'Mar 30', shoulder: 112, elbow: 125, knee: 102 },
  { date: 'Mar 31', shoulder: 120, elbow: 128, knee: 108 },
  { date: 'Apr 01', shoulder: 125, elbow: 130, knee: 110 },
  { date: 'Apr 02', shoulder: 128, elbow: 132, knee: 115 },
  { date: 'Apr 03', shoulder: 132, elbow: 135, knee: 118 },
]

export const mockCognitiveData = [
  { date: 'Mar 28', accuracy: 72, responseTime: 850 },
  { date: 'Mar 29', accuracy: 75, responseTime: 820 },
  { date: 'Mar 30', accuracy: 78, responseTime: 790 },
  { date: 'Mar 31', accuracy: 74, responseTime: 810 },
  { date: 'Apr 01', accuracy: 82, responseTime: 760 },
  { date: 'Apr 02', accuracy: 85, responseTime: 730 },
  { date: 'Apr 03', accuracy: 88, responseTime: 700 },
]

export const mockNotifications = [
  { id: 'n-1', message: '🏆 New badge earned: 7-Day Streak!', created_at: '2026-04-03T10:00:00Z', read: false },
  { id: 'n-2', message: '📈 Your ROM improved 12% this week', created_at: '2026-04-03T08:30:00Z', read: false },
  { id: 'n-3', message: '🎯 Daily exercise reminder: Time for your session!', created_at: '2026-04-03T07:00:00Z', read: false },
]

export const mockBadges = [
  { id: 'b-1', name: 'First Session', description: 'Complete your first rehab session', icon: '🎯', unlocked: true },
  { id: 'b-2', name: '7-Day Streak', description: 'Exercise 7 days in a row', icon: '🔥', unlocked: true },
  { id: 'b-3', name: 'Brain Trainer', description: 'Complete 10 cognitive games', icon: '🧠', unlocked: true },
  { id: 'b-4', name: 'ROM Champion', description: 'Reach 90% target ROM', icon: '💪', unlocked: false },
  { id: 'b-5', name: '30-Day Warrior', description: 'Exercise 30 days in a row', icon: '⚔️', unlocked: false },
  { id: 'b-6', name: 'Top 10', description: 'Reach top 10 on leaderboard', icon: '🏅', unlocked: false },
  { id: 'b-7', name: 'Perfect Score', description: 'Get 100% quality on a session', icon: '✨', unlocked: false },
  { id: 'b-8', name: 'Social Butterfly', description: 'Add 5 friends', icon: '🦋', unlocked: false },
]

export const mockSessionHeatmap = [
  // Generate 90 days of mock heatmap data
  ...Array.from({ length: 90 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (89 - i))
    return {
      date: date.toISOString().split('T')[0],
      count: Math.random() > 0.3 ? Math.floor(Math.random() * 4) + 1 : 0,
    }
  }),
]

export const mockRepQuality = [
  { exercise: 'Shoulder Flex', quality: 85 },
  { exercise: 'Elbow Ext', quality: 92 },
  { exercise: 'Knee Flex', quality: 78 },
  { exercise: 'Hip Abd', quality: 88 },
  { exercise: 'Wrist Rot', quality: 95 },
  { exercise: 'Ankle Dorsi', quality: 70 },
]

export const CONDITIONS = [
  { id: 'stroke', label: 'Stroke Recovery' },
  { id: 'frozen_shoulder', label: 'Frozen Shoulder' },
  { id: 'acl_rehab', label: 'ACL Rehabilitation' },
  { id: 'knee_replacement', label: 'Knee Replacement' },
  { id: 'hip_replacement', label: 'Hip Replacement' },
  { id: 'fracture_elbow', label: 'Elbow Fracture' },
  { id: 'carpal_tunnel', label: 'Carpal Tunnel' },
  { id: 'ankle_sprain', label: 'Ankle Sprain' },
  { id: 'spinal_cord', label: 'Spinal Cord Injury' },
  { id: 'parkinsons', label: "Parkinson's Disease" },
  { id: 'ms', label: 'Multiple Sclerosis' },
  { id: 'cerebral_palsy', label: 'Cerebral Palsy' },
]

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'mr', label: 'Marathi' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'bn', label: 'Bengali' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'kn', label: 'Kannada' },
  { code: 'pa', label: 'Punjabi' },
  { code: 'ml', label: 'Malayalam' },
]
