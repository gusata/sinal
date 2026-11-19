import { describe, expect, it } from 'vitest';
import { deserialize, exportSave, importSave, SaveError, serialize } from './save';
import { createInitialState, SAVE_VERSION } from './state';

describe('save', () => {
  it('ida e volta preserva o estado', () => {
    const s = createInitialState(123);
    s.data = 42.5;
    s.antennas = { fio: 3 };
    s.story.done = ['d01-chegada'];
    s.settings.buyMode = 'max';
    expect(deserialize(serialize(s))).toEqual(s);
  });

  it('completa campos que faltam e descarta lixo', () => {
    const s = deserialize(JSON.stringify({ version: 1, data: 'muito', antennas: { fio: 2, x: -1 } }), 99);
    expect(s.data).toBe(0);
    expect(s.antennas).toEqual({ fio: 2 });
    expect(s.settings.haptics).toBe(true);
    expect(s.lastSeen).toBe(99);
  });

  it('migra save v1 para v2', () => {
    const v1 = { version: 1, data: 500, antennas: { fio: 2 }, story: { done: ['d01-chegada'], unread: [], decoding: null } };
    const s = deserialize(JSON.stringify(v1), 7);
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.data).toBe(500);
    expect(s.upgrades).toEqual({});
    expect(s.spectrum.found).toEqual([]);
    expect(s.boost).toBeNull();
  });

  it('recusa JSON inválido e saves do futuro', () => {
    expect(() => deserialize('{nope')).toThrow(SaveError);
    expect(() => deserialize(JSON.stringify({ version: SAVE_VERSION + 1 }))).toThrow(SaveError);
  });

  it('exportar/importar funciona com acentos', () => {
    const s = createInitialState(1);
    s.story.done = ['ação-ç'];
    expect(importSave(exportSave(s))).toEqual(s);
    expect(() => importSave('###')).toThrow(SaveError);
  });
});
