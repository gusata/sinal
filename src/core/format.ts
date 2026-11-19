// Formatação de números grandes usando unidades que combinam com o tema.
// Dados → B, KB, MB, GB…  |  Sinal → Hz, kHz, MHz…
// Base 1000 (SI) para manter a leitura simples.

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB', 'RB', 'QB'] as const;
const HZ_UNITS = ['Hz', 'kHz', 'MHz', 'GHz', 'THz', 'PHz', 'EHz', 'ZHz', 'YHz', 'RHz', 'QHz'] as const;

function trimDecimals(v: number): string {
  if (v >= 100) return v.toFixed(0);
  if (v >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

function formatWithUnits(n: number, units: readonly string[], smallDecimals: number): string {
  if (!Number.isFinite(n)) return `∞ ${units[units.length - 1]}`;
  if (n < 0) return `-${formatWithUnits(-n, units, smallDecimals)}`;
  if (n < 1000) {
    const v = smallDecimals > 0 && n < 10 && n % 1 !== 0 ? n.toFixed(smallDecimals) : Math.floor(n).toString();
    return `${v} ${units[0]}`;
  }

  const last = units.length - 1;
  let i = Math.min(Math.floor(Math.log10(n) / 3), last);
  let v = n / 1000 ** i;
  // Evita "1000 KB" por arredondamento: sobe para a próxima unidade.
  if (v >= 999.5 && i < last) {
    i++;
    v = n / 1000 ** i;
  }
  if (v >= 1000) return `${(n / 1000 ** last).toExponential(2)} ${units[last]}`;
  return `${trimDecimals(v)} ${units[i]}`;
}

export function formatBytes(n: number): string {
  return formatWithUnits(n, BYTE_UNITS, 0);
}

export function formatHz(n: number): string {
  return formatWithUnits(n, HZ_UNITS, 1);
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}min` : `${h}h`;
  if (m > 0) return sec > 0 ? `${m}min ${sec}s` : `${m}min`;
  return `${sec}s`;
}
