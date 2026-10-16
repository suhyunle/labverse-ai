/**
 * Formula allow-list. Candidate formulas (plain text or LaTeX) are normalised to a
 * canonical string and compared with the normalised allowed variants.
 */

export interface AllowedFormula {
  id: string;
  label: string;
  variants: string[];
}

export const ALLOWED_FORMULAS: AllowedFormula[] = [
  { id: 'fall_time', label: '낙하 시간 t = √(2h/g)', variants: ['t = sqrt(2h/g)', 't = sqrt(2*h/g)', 't = \\sqrt{\\frac{2h}{g}}', 't = √(2h/g)'] },
  { id: 'velocity_time', label: '속도 v = gt', variants: ['v = g t', 'v = g*t', 'v = gt'] },
  { id: 'velocity_height', label: '낙하 속도 v = √(2gh)', variants: ['v = sqrt(2gh)', 'v = sqrt(2*g*h)', 'v = \\sqrt{2gh}', 'v = √(2gh)'] },
  {
    id: 'drag_force',
    label: '항력 F_d = ½ρv²C_dA',
    variants: ['F_d = 0.5 rho v^2 C_d A', 'F_d = 1/2 rho v^2 C_d A', 'F_d = ½ρv²C_dA', 'F_d = \\frac{1}{2} \\rho v^2 C_d A', 'F_d = 0.5*rho*v^2*C_d*A'],
  },
  // Extensions beyond the four required formulas; both follow directly from the quadratic-drag model.
  { id: 'terminal_velocity', label: '종단 속도 v_t = √(2mg/(ρC_dA))', variants: ['v_t = sqrt(2mg/(rho C_d A))', 'v_t = \\sqrt{\\frac{2 m g}{\\rho C_d A}}', 'v_t = √(2mg/(ρC_dA))'] },
  { id: 'position', label: '위치 y = h − ½gt²', variants: ['y = h - 0.5 g t^2', 'y(t) = h - 1/2 g t^2', 'y = h - ½gt²', 'y(t) = h - \\frac{1}{2} g t^2'] },
];

export function normalizeFormula(input: string): string {
  let s = input.trim();
  // \frac{a}{b} -> (a)/(b)   (repeat for nesting)
  for (let i = 0; i < 4; i++) s = s.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)');
  s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, 'sqrt($1)').replace(/√\s*\(/g, 'sqrt(');
  s = s.replace(/√\s*([a-z0-9]+)/gi, 'sqrt($1)');
  s = s.replace(/\\(rho|cdot|times|left|right)/g, (_m, w) => (w === 'rho' ? 'rho' : ''));
  s = s.replace(/ρ/g, 'rho').replace(/½/g, '0.5').replace(/\b1\/2\b/g, '0.5').replace(/\(1\)\/\(2\)/g, '0.5');
  s = s.replace(/²/g, '^2').replace(/−/g, '-');
  s = s.toLowerCase();
  // drop subscripts (t_fall -> t, f_d -> f) — they carry labels, not maths
  s = s.replace(/_\{[^}]*\}/g, '').replace(/_[a-z0-9]+/g, '');
  s = s.replace(/y\(t\)/g, 'y');
  s = s.replace(/[\s*{}\\]/g, '');
  // (2h/g) and 2h/g inside sqrt are equivalent spellings of the same radicand
  s = s.replace(/sqrt\(\(([^()]*)\)\/\(([^()]*)\)\)/g, 'sqrt(($1)/($2))');
  s = s.replace(/\(([a-z0-9.]+)\)/g, '$1');
  return s;
}

const ALLOWED_SET = new Map<string, AllowedFormula>();
for (const f of ALLOWED_FORMULAS) for (const v of f.variants) ALLOWED_SET.set(normalizeFormula(v), f);

/** Returns the matching allow-list entry, or null if the formula is not permitted. */
export function matchAllowedFormula(formula: string): AllowedFormula | null {
  return ALLOWED_SET.get(normalizeFormula(formula)) ?? null;
}
