export interface EssayMetric {
  label: string;
  value: number;
}

export interface EssaySubGrade {
  label: string;
  grade: string;
}

export interface EssaySuggestion {
  uuid: string; // Unique identifier for each suggestion
  type: string;
  from: string;
  to: string;
  startIndex?: number;
  endIndex?: number;
  position?: number; // Character position in essay
  category?: 'spelling' | 'grammar' | 'style' | 'structure' | 'clarity';
  priority?: 'high' | 'medium' | 'low';
}

export interface EssayReview {
  overallScore: number;
  metrics: EssayMetric[];
  subGrades: EssaySubGrade[];
  suggestions: EssaySuggestion[];
  timestamp: Date;
  version: number;
}

export interface AppliedSuggestion {
  suggestionIndex: number;
  originalText: string;
  newText: string;
  startIndex: number;
  endIndex: number;
  appliedAt: Date;
  category: string;
}

export interface ManualEdit {
  startIndex: number;
  endIndex: number;
  oldText: string;
  newText: string;
  editedAt: Date;
  quality?: 'improved' | 'worsened' | 'neutral';
}

export interface EssayVersion {
  content: string;
  timestamp: Date;
  version: number;
  wordCount: number;
  appliedSuggestions: AppliedSuggestion[];
  manualEdits: ManualEdit[];
}

export interface EssayContext {
  currentVersion: EssayVersion;
  previousVersions: EssayVersion[];
  reviewHistory: EssayReview[];
  skippedSuggestions: number[];
  totalSuggestionsApplied: number;
  totalManualEdits: number;
}

export interface ScoreChange {
  category: string;
  previousScore: number;
  newScore: number;
  change: number;
  reason: string;
}

export interface ReviewRequest {
  essayContent: string;
  prompt?: string;
  assistId: string;
  context: EssayContext;
  skipSuggestions?: boolean;
  onlySuggestions?: boolean;
}

export interface ReviewResponse {
  review: EssayReview;
  scoreChanges: ScoreChange[];
  appliedChanges: boolean;
  detectedChanges: {
    appliedSuggestions: AppliedSuggestion[];
    manualEdits: ManualEdit[];
  };
}



export interface DiffResult {
  appliedSuggestions: AppliedSuggestion[];
  manualEdits: ManualEdit[];
  changeType: 'suggestion_applied' | 'manual_edit' | 'mixed' | 'none';
  significantChange: boolean;
} 