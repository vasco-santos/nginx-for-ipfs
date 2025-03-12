import * as API from '../api.js'

import { base58btc } from 'multiformats/bases/base58'

import { createFromIndexRecordEntry } from '../record/block.js'

/**
 * @typedef {import('multiformats').UnknownLink} UnknownLink
 */

/**
 * In-memory implementation of BlockIndexStore
 *
 * @implements {API.IndexStore<API.BlockIndexRecordView>}
 */
export class MemoryBlockIndexStore {
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
   * @param {API.BlockIndexRecordView} data
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
   * @returns {Promise<API.BlockIndexRecordView | null>}
   */
  async get(hash) {
    const key = MemoryBlockIndexStore.encodeKey(hash)
    const data = this.store.get(key)
    if (!data) return null
    return this.decodeData(data)
  }

  /**
   * Store an index entry.
   *
   * @param {API.MultihashDigest} hash
   * @param {API.BlockIndexRecordView} entry
   * @returns {Promise<void>}
   */
  async set(hash, entry) {
    const key = MemoryBlockIndexStore.encodeKey(hash)
    this.store.set(key, this.encodeData(entry))
  }
}
