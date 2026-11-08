// ブラウザの localStorage を AsyncStorage と同じ形（非同期）で使うための小さな入れ物。
// プライベートモードなどで localStorage が使えないときは、メモリ上に保存する（ページを閉じると消える）。

const memory = new Map<string, string>();

function ls(): Storage | null {
  try {
    const s = globalThis.localStorage;
    const probe = '__nagara_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

const kv = {
  async getItem(key: string): Promise<string | null> {
    const s = ls();
    return s ? s.getItem(key) : (memory.get(key) ?? null);
  },
  async setItem(key: string, value: string): Promise<void> {
    const s = ls();
    if (s) {
      try {
        s.setItem(key, value);
        return;
      } catch {
        // 容量オーバーなど。メモリに逃がす
      }
    }
    memory.set(key, value);
  },
  async removeItem(key: string): Promise<void> {
    ls()?.removeItem(key);
    memory.delete(key);
  },
};

export default kv;
