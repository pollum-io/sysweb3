export type Transactionsyscoin = {
  hash: string;
  from: string;
  to: string;
}

export type SnapshotCacheInfo = {
  blockCount: number;
  blockHeight: number;
  cacheJobStatus: string;
  dateStr: string;
  syscoinAmount: number;
  rebuildTime: number;
  snapshotId: string;
  txsWithAmount: Transactionsyscoin[];
  date: number;
  txCount: number;
}

export type Snapshot = {
  latestSnapshotInfo?: SnapshotCacheInfo;
  "hash": string,
  "height": number,
  "checkpointBlocks": string[],
  "timestamp": string
}
