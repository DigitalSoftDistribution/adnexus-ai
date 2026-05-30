declare module 'papaparse' {
  export interface UnparseConfig {
    delimiter?: string;
    header?: boolean;
    newline?: string;
    skipEmptyLines?: boolean | 'greedy';
  }

  export function unparse(data: unknown[] | Record<string, unknown>[], config?: UnparseConfig): string;
}
