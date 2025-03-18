import * as API from '../api.js'
import { DigestMap } from '../utils/digest-map.js'

export const type = 'index/sharded/dag@0.1'

/** @implements {API.ShardedDAGIndexRecordView} */
export class ShardedDAGIndexRecord {
  /**
   * @param {API.UnknownLink} content
   */
  constructor(content) {
    this.content = content
    this.shards = new DigestMap()
  }

  /**
   * @param {API.ShardDigest} shard
   * @param {API.SliceDigest} slice
   * @param {API.Position} pos
   */
  setSlice(shard, slice, pos) {
    let index = this.shards.get(shard)
    if (!index) {
      index = new DigestMap()
      this.shards.set(shard, index)
    }
    index.set(slice, pos)
  }

  /**
   * Convert this instance into a structured IndexRecordEntry.
   *
   * @returns {API.IndexRecordEntry}
   */
  toIndexRecordEntry() {
    return {
      type,
      data: this,
    }
  }
}

/**
 * @param {API.IndexRecordEntry} entry
 * @returns {API.ShardedDAGIndexRecordView}
 */
export function createFromIndexRecordEntry(entry) {
  if (entry.type !== type) {
    throw new Error('Invalid entry type')
  }

  const record = new ShardedDAGIndexRecord(entry.data.content)
  for (const [shardDigest, slices] of entry.data.shards.entries()) {
    for (const [sliceDigest, pos] of slices.entries()) {
      record.setSlice(shardDigest, sliceDigest, pos)
    }
  }
  return record
}
