// Legacy workout demo waveform, retained for reversibility and tests; never imported by active BLE code.
export function legacyWorkoutBpmAt(s: number): number {
  const c = s % 150
  if (c < 40) return 90 + 60 * (c / 40)
  return 90 + 60 * Math.exp(-(c - 40) / 20)
}
