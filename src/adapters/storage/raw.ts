/** The slice of the Web Storage API the Repository needs; `localStorage` satisfies it. */
export interface RawStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  readonly length: number;
  key(index: number): string | null;
}

export function createMemoryRawStore(): RawStore {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
    get length() {
      return map.size;
    },
    key: (index) => Array.from(map.keys())[index] ?? null,
  };
}

const PROBE_KEY = "__impromptu_probe__";

/** Write, read back, remove. False on any throw or mismatch (AD-9 availability probe). */
export function probe(raw: RawStore): boolean {
  try {
    raw.setItem(PROBE_KEY, "1");
    const ok = raw.getItem(PROBE_KEY) === "1";
    raw.removeItem(PROBE_KEY);
    return ok;
  } catch {
    return false;
  }
}
