import { Capacitor } from '@capacitor/core';
import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications';
import type { Game } from '../core/game';

// Notificações locais (sem servidor): agendadas quando o app vai para segundo plano,
// canceladas quando ele volta. Só no app nativo, nunca no navegador.
//
// No máximo três, todas sobre coisas que o jogador pediu: decifração, varredura e
// o gravador parando. Nada de "volte para jogar!".

const ID_DECODE = 1;
const ID_SCAN = 2;
const ID_TAPES = 3;
const ALL_IDS = [ID_DECODE, ID_SCAN, ID_TAPES];
/** Só avisa que as fitas acabaram se o limite for de pelo menos isso. */
const MIN_TAPES_NOTICE_MS = 60 * 60 * 1000;

const isNative = () => Capacitor.isNativePlatform();
let permissionAsked = false;

/** Pede permissão (uma vez por sessão), de preferência logo após uma ação do jogador. */
export async function ensureNotificationPermission(enabled: boolean): Promise<void> {
  if (!isNative() || !enabled || permissionAsked) return;
  permissionAsked = true;
  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display === 'prompt' || status.display === 'prompt-with-rationale') {
      await LocalNotifications.requestPermissions();
    }
  } catch (err) {
    console.warn('Notificações indisponíveis', err);
  }
}

/** Agenda os avisos para quando o jogador está fora. */
export async function scheduleAwayNotifications(game: Game, now = Date.now()): Promise<void> {
  if (!isNative()) return;
  await cancelAwayNotifications();
  if (!game.state.settings.notifications) return;

  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display !== 'granted') return;

    const list: LocalNotificationSchema[] = [];
    const { decoding } = game.state.story;
    const { scan } = game.state.spectrum;

    if (decoding && decoding.endsAt > now) {
      list.push({
        id: ID_DECODE,
        title: 'Transmissão decifrada',
        body: 'Uma mensagem nova está no Diário.',
        schedule: { at: new Date(decoding.endsAt), allowWhileIdle: true },
      });
    }
    if (scan && scan.endsAt > now) {
      list.push({
        id: ID_SCAN,
        title: 'Varredura concluída',
        body: 'O resultado está no Espectro.',
        schedule: { at: new Date(scan.endsAt), allowWhileIdle: true },
      });
    }
    const capMs = game.offlineCapSeconds() * 1000;
    if (capMs >= MIN_TAPES_NOTICE_MS) {
      list.push({
        id: ID_TAPES,
        title: 'As fitas acabaram',
        body: 'O gravador parou de registrar. As antenas estão captando para ninguém.',
        schedule: { at: new Date(now + capMs), allowWhileIdle: true },
      });
    }

    if (list.length > 0) await LocalNotifications.schedule({ notifications: list });
  } catch (err) {
    console.warn('Falha ao agendar notificações', err);
  }
}

export async function cancelAwayNotifications(): Promise<void> {
  if (!isNative()) return;
  try {
    await LocalNotifications.cancel({ notifications: ALL_IDS.map((id) => ({ id })) });
  } catch {
    /* nada agendado */
  }
}
