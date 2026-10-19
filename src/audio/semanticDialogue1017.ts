import manifest from './semanticDialogue1017.json';
import type { CueCatalog } from './audioTypes';

interface DialogueLine { file: string; label: string; translation: string; transcriptVerified: boolean }

/** Explicit accepted semantic uses only; no candidate-directory scan or guessed words. */
export function withSemanticDialogue(catalog: CueCatalog): CueCatalog {
  return { ...catalog, ...manifest.cues as CueCatalog };
}

export function semanticDialogueLine(file: string): DialogueLine | undefined {
  return (manifest.lines as DialogueLine[]).find(line => line.file === file);
}

/** Exact reviewed file identities also hold when delivered through an encoded bank. */
export async function verifySemanticDialogue(file: string, bytes: ArrayBuffer, sourceSha256?: string): Promise<void> {
  const expected = (manifest.fileChecks as Record<string, { sha256: string; bytes: number }>)[file];
  if (!expected) return;
  if (sourceSha256 !== undefined) {
    if (sourceSha256 !== expected.sha256) throw new Error('Semantic dialogue delivery source SHA256 mismatch');
    return;
  }
  const actual = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
  if (bytes.byteLength !== expected.bytes || actual !== expected.sha256) throw new Error('Semantic dialogue exact audio SHA256 mismatch');
}
