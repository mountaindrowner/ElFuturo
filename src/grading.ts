// Typed-production grading: normalize whitespace and case, then exact match.
// Accents ARE graded (a missing tilde is a miss).

export function normalize(s: string): string {
  return s
    .replace(/[¡!¿?.,;:«»"“”'’]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function isCorrect(input: string, answer: string, accept?: string[]): boolean {
  const n = normalize(input);
  if (n === normalize(answer)) return true;
  // "a / b" alternatives inside one answer string
  for (const alt of answer.split(" / ")) {
    if (n === normalize(alt)) return true;
  }
  for (const a of accept ?? []) {
    if (n === normalize(a)) return true;
    for (const alt of a.split(" / ")) if (n === normalize(alt)) return true;
  }
  return false;
}

export type DiffOp = { ch: string; kind: "same" | "add" | "del" };

/** Character-level diff (LCS) between the typed answer and the correct answer. */
export function charDiff(typed: string, correct: string): DiffOp[] {
  const a = [...typed], b = [...correct];
  const m = a.length, n = b.length;
  // LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: DiffOp[] = [];
  let i = 0, j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) { ops.push({ ch: a[i], kind: "same" }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ ch: a[i], kind: "del" }); i++; }
    else { ops.push({ ch: b[j], kind: "add" }); j++; }
  }
  while (i < m) { ops.push({ ch: a[i], kind: "del" }); i++; }
  while (j < n) { ops.push({ ch: b[j], kind: "add" }); j++; }
  return ops;
}

/** Strip tildes/diacritics from vowels (for the accent-placement drill prompt). */
export function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-̂̈]/g, "").normalize("NFC");
}
