import { beforeEach, describe, expect, it } from 'vitest';

import { loadDemoBookPack } from './loadDemoBookPack';
import { clearAllRuntimeState, clearRuntimeState } from './runtimeStore';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe('runtime progress deletion boundary', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: storage,
    });
  });

  it('현재 book의 모든 pack key와 legacy만 지우고 다른 book과 unrelated key를 보존한다', () => {
    const pack = loadDemoBookPack();
    storage.setItem('soombook.runtime.local-default.book-tiger-demo.0.2.0', 'previous');
    storage.setItem('soombook.runtime.local-default.book-tiger-demo.0.3.0', 'current');
    storage.setItem('soombook.runtime.book-tiger-demo', 'legacy');
    storage.setItem('soombook.runtime.local-default.other-book.0.1.0', 'other-book');
    storage.setItem('another-project', 'unrelated');

    expect(clearRuntimeState(pack)).toBe(true);
    expect(storage.getItem('soombook.runtime.local-default.book-tiger-demo.0.2.0')).toBeNull();
    expect(storage.getItem('soombook.runtime.local-default.book-tiger-demo.0.3.0')).toBeNull();
    expect(storage.getItem('soombook.runtime.book-tiger-demo')).toBeNull();
    expect(storage.getItem('soombook.runtime.local-default.other-book.0.1.0')).toBe('other-book');
    expect(storage.getItem('another-project')).toBe('unrelated');
  });

  it('render error 전체 reset은 Soombook prefix만 지운다', () => {
    storage.setItem('soombook.runtime.local-default.book-a.1.0.0', 'a');
    storage.setItem('soombook.runtime.book-a', 'legacy');
    storage.setItem('another-project', 'unrelated');

    expect(clearAllRuntimeState()).toBe(true);
    expect(storage.getItem('soombook.runtime.local-default.book-a.1.0.0')).toBeNull();
    expect(storage.getItem('soombook.runtime.book-a')).toBeNull();
    expect(storage.getItem('another-project')).toBe('unrelated');
  });

  it('storage 삭제 실패를 false로 보고한다', () => {
    const pack = loadDemoBookPack();
    storage.setItem('soombook.runtime.local-default.book-tiger-demo.0.3.0', 'current');
    storage.removeItem = () => {
      throw new Error('synthetic storage failure');
    };

    expect(clearRuntimeState(pack)).toBe(false);
    expect(clearAllRuntimeState()).toBe(false);
  });

  it('전체 reset의 부분 삭제 실패를 false로 보고하고 unrelated key를 보존한다', () => {
    storage.setItem('soombook.runtime.a', 'a');
    storage.setItem('soombook.runtime.b', 'b');
    storage.setItem('another-project', 'unrelated');
    const removeItem = storage.removeItem.bind(storage);
    let calls = 0;
    storage.removeItem = (key) => {
      calls += 1;
      if (calls === 2) throw new Error('synthetic partial storage failure');
      removeItem(key);
    };

    expect(clearAllRuntimeState()).toBe(false);
    expect(storage.getItem('another-project')).toBe('unrelated');
    expect(
      ['soombook.runtime.a', 'soombook.runtime.b'].filter((key) => storage.getItem(key) !== null),
    ).toHaveLength(1);
  });
});
