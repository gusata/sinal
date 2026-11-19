import { Preferences } from '@capacitor/preferences';

// No celular usa o armazenamento nativo (SharedPreferences / UserDefaults),
// que o sistema não apaga como faz às vezes com o localStorage do WebView.
// No navegador, o próprio plugin usa localStorage.

const SAVE_KEY = 'sinal.save';

export async function loadSave(): Promise<string | null> {
  try {
    const { value } = await Preferences.get({ key: SAVE_KEY });
    return value;
  } catch (err) {
    console.error('Falha ao ler save', err);
    return null;
  }
}

export async function writeSave(raw: string): Promise<void> {
  try {
    await Preferences.set({ key: SAVE_KEY, value: raw });
  } catch (err) {
    console.error('Falha ao gravar save', err);
  }
}

export async function clearSave(): Promise<void> {
  await Preferences.remove({ key: SAVE_KEY });
}
