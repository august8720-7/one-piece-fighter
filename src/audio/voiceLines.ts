import manifest from './voiceLines0922.json';
import { rosterCandidateLine } from './rosterVoiceCandidates1003';
import { semanticDialogueLine } from './semanticDialogue1017';
interface VoiceLine { file: string; label: string; translation: string; transcriptVerified: boolean }

/** The exact chosen file, not a separately randomized subtitle, owns the wording. */
export function voiceLine(file: string): { text: string; transcriptVerified: boolean } {
  const line = semanticDialogueLine(file) ?? (manifest.lines as VoiceLine[]).find(entry => entry.file === file) ?? rosterCandidateLine(file);
  return line?.transcriptVerified
    ? { text: line.translation, transcriptVerified: true }
    : { text: line?.label ?? '', transcriptVerified: false };
}
