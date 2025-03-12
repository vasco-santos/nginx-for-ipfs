import * as API from '../api.js'

import { base58btc } from 'multiformats/bases/base58'

import { createFromIndexRecordEntry } from '../record/sharded-dag.js'

/**
 * @typedef {import('multiformats').UnknownLink} UnknownLink
 */

/**
 * In-memory implementation of ShardedDAGIndexStore
 *
 * @implements {API.IndexStore<API.ShardedDAGIndexRecordView>}
 */
export class MemoryShardedDAGIndexStore {
  constructor() {
    /** @type {Map<string, API.IndexRecordEntry>} */
    this.store = new Map()
  }

  /**
   * Generate a key for storage: b58(mh(CID))
   *
   * @param {API.MultihashDigest} hash
   * @returns {string}
   */
  static encodeKey(hash) {
    return base58btc.encode(hash.bytes)
  }

  /**
   * @param {API.ShardedDAGIndexRecordView} data
   */
  encodeData(data) {
    return data.toIndexRecordEntry()
  }

  /**
   * @param {API.IndexRecordEntry} data
   */
  decodeData(data) {
    return createFromIndexRecordEntry(data)
  }

  /**
   * @param {API.MultihashDigest} hash
   * @returns {Promise<API.ShardedDAGIndexRecordView | null>}
   */
  async get(hash) {
    const key = MemoryShardedDAGIndexStore.encodeKey(hash)
    const data = this.store.get(key)
    if (!data) return null
    return this.decodeData(data)
  }

  /**
   * Store an index entry.
   *
   * @param {API.MultihashDigest} hash
   * @param {API.ShardedDAGIndexRecordView} entry
   * @returns {Promise<void>}
   */
  async set(hash, entry) {
    const key = MemoryShardedDAGIndexStore.encodeKey(hash)
    this.store.set(key, this.encodeData(entry))
  }
}
