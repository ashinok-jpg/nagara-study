import type { ChunkSize } from '../engine';

export const CHUNK_SIZE_OPTIONS: { value: ChunkSize; label: string; sub: string }[] = [
  { value: 'short', label: '短め', sub: '約15秒' },
  { value: 'normal', label: '標準', sub: '約30秒' },
  { value: 'long', label: '長め', sub: '約1分' },
];
