export interface CheckResult {
  id: 'schema' | 'ranges' | 'units' | 'formulas' | 'engine';
  label: string;
  passed: boolean;
  /** Human readable outcome; on failure it lists every violation (fed back to the model on retries). */
  message: string;
  errors: string[];
}

export interface VerificationReport {
  checks: CheckResult[];
  passed: boolean;
  /** Flat list of error strings across all failed checks. */
  errors: string[];
}
