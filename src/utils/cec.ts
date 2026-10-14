import type { ValidatedLogLine } from '../components/LogMessage';
import { getCecAnnotation, CecIntent } from './cecAnnotations';

// A CEC tag is the label of the blue "CEC · ..." pill shown on a log row (see cecAnnotations.ts)
export interface CecTag {
  tag: string;
  count: number;
  intent: CecIntent;
}

export interface CecIndex {
  /** Distinct tags found in the loaded logs, most frequent first */
  tags: CecTag[];
  /** The tag of each annotated log line, for filtering */
  tagOf: WeakMap<ValidatedLogLine, string>;
}

export function buildCecIndex(logs: ValidatedLogLine[]): CecIndex {
  const counts = new Map<string, CecTag>();
  const tagOf = new WeakMap<ValidatedLogLine, string>();

  for (const log of logs) {
    const annotation = getCecAnnotation(log);
    if (!annotation) continue;
    tagOf.set(log, annotation.label);
    const existing = counts.get(annotation.label);
    if (existing) existing.count++;
    else counts.set(annotation.label, { tag: annotation.label, count: 1, intent: annotation.intent });
  }

  const tags = [...counts.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  return { tags, tagOf };
}
