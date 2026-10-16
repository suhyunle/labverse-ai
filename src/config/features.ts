/**
 * Feature flags. The MVP is Paper-to-Lab -> generation -> verification -> Dr. Nova -> Gravity Lab.
 * Everything else stays in the codebase but is hidden unless enabled, e.g. VITE_FEATURE_OTHER_LABS=true.
 */
const flag = (name: string): boolean => {
  try {
    return (import.meta as any).env?.[`VITE_FEATURE_${name}`] === 'true';
  } catch {
    return false;
  }
};

export const FEATURES = {
  otherLabs: flag('OTHER_LABS'), // optics, fluid, volcano, solar system, buoyancy, conceptual
  diagramToLab: flag('DIAGRAM_TO_LAB'),
  parallelUniverse: flag('PARALLEL_UNIVERSE'),
  hypothesisArena: flag('HYPOTHESIS_ARENA'),
  evidenceLens: flag('EVIDENCE_LENS'),
  researchTree: flag('RESEARCH_TREE'),
  labNotebook: flag('LAB_NOTEBOOK'),
} as const;

export const APP_NAME = 'LabVerse AI';
export const APP_TAGLINE = '논문에서 실험으로 — 검증 가능한 AI 과학 실험실';
