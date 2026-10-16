export type ExperimentDomain =
  | 'earth_science'
  | 'astronomy'
  | 'physics'
  | 'chemistry'
  | 'biology'
  | 'general';

export type SceneType = 'volcano' | 'solar_system' | 'buoyancy' | 'conceptual';

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

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  actionSummary?: string;
  variableUpdates?: Record<string, number>;
  followUpSuggestion?: string;
}
