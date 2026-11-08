import { createStore, del, get, set } from 'idb-keyval';
import type { StateStorage } from 'zustand/middleware';

/**
 * 端末内だけに保存するストレージ。
 * IndexedDB が使えない環境（プライベートブラウズ等）では localStorage に、
 * それも使えなければメモリに退避する。外部には一切送らない。
 */
let idbStore: ReturnType<typeof createStore> | null = null;
const memory = new Map<string, string>();

function idb() {
  if (idbStore) return idbStore;
  if (typeof indexedDB === 'undefined') return null;
  try {
    idbStore = createStore('mushi-niwa', 'kv');
    return idbStore;
  } catch {
    return null;
  }
}

function ls(): Storage | null {
  try {
    const s = globalThis.localStorage;
    const k = '__mushi_probe__';
    s.setItem(k, '1');
    s.removeItem(k);
    return s;
  } catch {
    return null;
  }
}

export const deviceStorage: StateStorage = {
  async getItem(name) {
    const store = idb();
    if (store) {
      try {
        const v = await get<string>(name, store);
        if (v !== undefined) return v;
      } catch {
        /* fall through */
      }
    }
    return ls()?.getItem(name) ?? memory.get(name) ?? null;
  },
  async setItem(name, value) {
    const store = idb();
    if (store) {
      try {
        await set(name, value, store);
        return;
      } catch {
        /* fall through */
      }
    }
    const s = ls();
    if (s) s.setItem(name, value);
    else memory.set(name, value);
  },
  async removeItem(name) {
    const store = idb();
    if (store) {
      try {
        await del(name, store);
      } catch {
        /* ignore */
      }
    }
    ls()?.removeItem(name);
    memory.delete(name);
  },
};
