import { Haptics, ImpactStyle } from '@capacitor/haptics';

// Vibração curta. No navegador do PC não faz nada (o erro é ignorado de propósito).

export function hapticLight(enabled: boolean): void {
  if (!enabled) return;
  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
}

export function hapticMedium(enabled: boolean): void {
  if (!enabled) return;
  Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
}
