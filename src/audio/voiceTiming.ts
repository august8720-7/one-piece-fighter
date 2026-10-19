/** Accepted full Twinkle win is1.944s. Round cleanup starts at150, so32 leaves
 * 118/60=1.9667s; the historical40 frame point would cut about111ms. No audio
 * processing or core round timing changes. Other accepted cues fit40..150.
 */
export function victoryVoiceFrame(characterId: string): number {
  return characterId === 'twinkle' ? 32 : 40;
}
