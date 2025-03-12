import * as API from '../api.js'

export const type = 'index/block@0.1'

/** @implements {API.BlockIndexRecordView} */
export class BlockIndexRecord {
  /**
   * @param {API.MultihashDigest} multihash
   * @param {API.MultihashDigest} container
   * @param {number} offset
   * @param {number} length
   */
  constructor(multihash, container, offset, length) {
    this.multihash = multihash
    this.container = container
    this.offset = offset
    this.length = length
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
 * @returns {API.BlockIndexRecordView}
 */
export function createFromIndexRecordEntry(entry) {
  if (entry.type !== type) {
    throw new Error('Invalid entry type')
  }
  return new BlockIndexRecord(
    entry.data.multihash,
    entry.data.container,
    entry.data.offset,
    entry.data.length
  )
}
