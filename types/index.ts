// TypeScript interfaces for True Path Finder

// ============================================================================
// User Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  timezone: string;
  createdAt: Date;
  onboardingComplete: boolean;
}

export interface DailySession {
  date: string; // YYYY-MM-DD
  minutesUsed: number;
  lastActive: Date;
}

// ============================================================================
// Goal Types
// ============================================================================

export interface Goal {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  createdAt: Date;
  groupId: string; // 'general' or private group ID
}

export interface ChosenGoal {
  goalId: string;
  addedAt: Date;
}

// ============================================================================
// Method Types
// ============================================================================

export interface Resource {
  title: string;
  url: string;
}

export interface SuggestedMinimum {
  type: 'hours' | 'days' | 'attempts';
  value: number;
}

export interface MethodStats {
  activeUsers: number;
  avgRating: number;
  reviewCount: number;
}

export interface Method {
  id: string;
  goalId: string;
  title: string;
  description: string;
  resources: Resource[];
  suggestedMinimum: SuggestedMinimum;
  createdBy: string;
  createdAt: Date;
  stats: MethodStats;
}

export interface Attempt {
  date: Date;
  durationMinutes?: number;
  notes?: string;
}

export interface ChosenMethod {
  methodId: string;
  addedAt: Date;
  attempts: Attempt[];
  status: 'active' | 'tested';
}

// ============================================================================
// Review Types
// ============================================================================

export interface AttemptsSummary {
  count: number;
  totalDurationMinutes: number;
}

export interface Review {
  id: string;
  methodId: string;
  userId: string;
  score: number; // 1-5
  content: string;
  attemptsSummary: AttemptsSummary;
  metMinimum: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Event Types (Phase 2)
// ============================================================================

export interface EventPhase {
  durationSeconds: number;
}

export interface EventPhases {
  arrival: EventPhase;
  practice: EventPhase;
  close: EventPhase;
}

export interface TPFEvent {
  id: string;
  methodId: string;
  title: string;
  description: string;
  links: Resource[];
  phases: EventPhases;
  startTime: Date;
  maxPerBatch: number;
  createdBy: string;
}

export interface EventBatch {
  batchNumber: number;
  participants: string[]; // user IDs
}

// ============================================================================
// Group Types (Phase 3)
// ============================================================================

export interface Group {
  id: string;
  name: string;
  isGeneral: boolean;
  createdBy: string;
  members: string[];
}
