/**
 * Calculate a scalar volume level (0–1) from byte frequency data.
 *
 * The value is the mean of all frequency bins normalised to [0, 1].
 */
export function calculateVolume(
  frequencyData: Uint8Array<ArrayBuffer>
): number {
  if (frequencyData.length === 0) {
    return 0;
  }

  let volume = 0;
  for (let i = 0; i < frequencyData.length; i++) {
    volume += frequencyData[i] / 255;
  }
  volume /= frequencyData.length;

  return volume < 0 ? 0 : volume > 1 ? 1 : volume;
}
