import { describe, expect, it } from 'vitest';
import { formatBytes, formatDuration, formatHz } from './format';

describe('formatação', () => {
  it('bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(999)).toBe('999 B');
    expect(formatBytes(1000)).toBe('1.00 KB');
    expect(formatBytes(1240)).toBe('1.24 KB');
    expect(formatBytes(12_400)).toBe('12.4 KB');
    expect(formatBytes(999_999)).toBe('1.00 MB');
    expect(formatBytes(3.2e12)).toBe('3.20 TB');
    expect(formatBytes(5e40)).toMatch(/QB$/);
  });

  it('hertz mostra decimal em valores pequenos', () => {
    expect(formatHz(0.1)).toBe('0.1 Hz');
    expect(formatHz(8)).toBe('8 Hz');
    expect(formatHz(1500)).toBe('1.50 kHz');
  });

  it('duração', () => {
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(90)).toBe('1min 30s');
    expect(formatDuration(3600)).toBe('1h');
    expect(formatDuration(2 * 3600 + 13 * 60)).toBe('2h 13min');
  });
});
