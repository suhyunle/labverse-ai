export type ExperimentDomain =
  | 'physics'
  | 'optics'
  | 'fluid_dynamics'
  | 'earth_science'
  | 'astronomy'
  | 'chemistry'
  | 'biology'
  | 'general';

export type SceneType =
  | 'gravity'
  | 'optics'
  | 'fluid'
  | 'volcano'
  | 'solar_system'
  | 'buoyancy'
  | 'conceptual';

export type LearningLevel = 'beginner' | 'intermediate' | 'advanced';

export interface VariableSpec {
  id: string;
  label: string;
  min: number;
  max: number;
  default: number;
  step: number;
  unit: string;
  description: string;
  category?: string;
}

export interface ObservableOutput {
  id: string;
  label: string;
  unit: string;
  formula?: string;
  description: string;
}

export interface ScientificPrinciple {
  name: string;
  description: string;
  formula?: string;
}

export interface GuidedStep {
  stepNumber: number;
  title: string;
  instruction: string;
  targetAction?: string;
}

export interface ResearchCitation {
  title: string;
  authors: string[];
  year: number;
  journalOrConference?: string;
  doi?: string;
  url?: string;
  openAlexId?: string;
  relevance: string;
  verified: boolean;
}

export interface EvidenceItem {
  id: string;
  targetKey: string;
  label: string;
  formulaOrValue: string;
  type: 'verified_constant' | 'established_law' | 'user_parameter' | 'model_assumption' | 'educational_approximation';
  sourceName: string;
  sourceUrl?: string;
  description: string;
  limitations?: string;
}

export interface VisualAnnotation {
  id: string;
  type: 'arrow' | 'callout' | 'highlight' | 'formula_badge';
  label: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  color?: string;
  details?: string;
}

export interface ExperimentSpec {
  id: string;
  title: string;
  domain: ExperimentDomain;
  sceneType: SceneType;
  learningObjectives: string[];
  scientificPrinciples: ScientificPrinciple[];
  variables: VariableSpec[];
  observableOutputs: ObservableOutput[];
  simulationModel: string;
  visualEffects: string[];
  safetyNotes: string[];
  explanation: string;
  guidedSteps: GuidedStep[];
  suggestedQueries: string[];
  citations?: ResearchCitation[];
  evidenceItems?: EvidenceItem[];
  annotations?: VisualAnnotation[];
  isConceptualOnly?: boolean;
  limitations?: string;
}

export interface ExperimentSnapshot {
  id: string;
  timestamp: number;
  label: string;
  variables: Record<string, number>;
  metrics: Record<string, number | string>;
  note?: string;
}

export interface HypothesisEvaluation {
  id: string;
  userHypothesis: string;
  simulatedOutcomeSummary: string;
  isConsistentWithPhysics: boolean;
  aiExplanation: string;
  misconceptionsIdentified: string[];
  suggestedFollowUpExperiments: string[];
  timestamp: number;
}

export interface ResearchTreeNode {
  id: string;
  parentId: string | null;
  label: string;
  sceneType: SceneType;
  variables: Record<string, number>;
  metrics: Record<string, number | string>;
  hypothesis?: string;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  actionSummary?: string;
  variableUpdates?: Record<string, number>;
  followUpSuggestion?: string;
  proposedVisualAnnotations?: VisualAnnotation[];
}
