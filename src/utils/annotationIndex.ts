import type { ValidatedLogLine } from '../components/LogMessage';
import type { CecIntent } from './cecAnnotations';

// A tag is the label of an annotation pill shown on a log row ("CEC · ...", "Join · ...").
// The sidebar lists the tags found in the loaded logs so they can be used as filters.
export interface AnnotationTag {
  tag: string;
  count: number;
  intent: CecIntent;
}

export interface AnnotationIndex {
  /** Distinct tags found in the loaded logs, most frequent first */
  tags: AnnotationTag[];
  /** The tag of each annotated log line, for filtering */
  tagOf: WeakMap<ValidatedLogLine, string>;
}

type GetAnnotation = (log: ValidatedLogLine) => { label: string; intent: CecIntent } | null;

export function buildAnnotationIndex(logs: ValidatedLogLine[], getAnnotation: GetAnnotation): AnnotationIndex {
  const counts = new Map<string, AnnotationTag>();
  const tagOf = new WeakMap<ValidatedLogLine, string>();

  for (const log of logs) {
    const annotation = getAnnotation(log);
    if (!annotation) continue;
    tagOf.set(log, annotation.label);
    const existing = counts.get(annotation.label);
    if (existing) existing.count++;
    else counts.set(annotation.label, { tag: annotation.label, count: 1, intent: annotation.intent });
  }

  const tags = [...counts.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  return { tags, tagOf };
}
