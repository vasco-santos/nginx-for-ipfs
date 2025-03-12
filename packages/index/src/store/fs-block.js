import * as API from '../api.js'

import { base58btc } from 'multiformats/bases/base58'

import fs from 'fs/promises'
import path from 'path'
import { encode, decode } from '@ipld/dag-json'
import { decode as decodeDigest } from 'multiformats/hashes/digest'

import { createFromIndexRecordEntry } from '../record/block.js'

/**
 * @typedef {object} PreEncodedData
 * @property {Uint8Array} multihash
 * @property {Uint8Array} container
 * @property {number} offset
 * @property {number} length
 */

/**
 * File system implementation of BlockIndexStore
 *
 * @implements {API.IndexStore<API.BlockIndexRecordView>}
 */
export class FSBlockStore {
  /**
   * @param {string} directory
   */
  constructor(directory) {
    this.directory = directory
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
   * Generate a path for storage: b58(mh(CID))
   *
   * @param {API.MultihashDigest} hash
   * @returns {string}
   */
  _getFilePath(hash) {
    return path.join(this.directory, FSBlockStore.encodeKey(hash))
  }

  /**
   * @param {API.BlockIndexRecordView} data
   */
  encodeData(data) {
    /** @type {{ type: 'index/block@0.1'; data: API.BlockIndexRecord }} */
    // @ts-expect-error we now is a BlockIndexRecord
    const entry = data.toIndexRecordEntry()
    const encodableEntry = {
      ...entry,
      data: {
        ...entry.data,
        multihash: entry.data.multihash.bytes,
        container: entry.data.container.bytes,
      },
    }
    return encode(encodableEntry)
  }

  /**
   * @param {Uint8Array} data
   */
  decodeData(data) {
    const decodedData = decode(data)
    const entry = {
      ...decodedData,
      data: {
        ...decodedData.data,
        multihash: decodeDigest(decodedData.data.multihash),
        container: decodeDigest(decodedData.data.container),
      },
    }

    return createFromIndexRecordEntry(entry)
  }

  /**
   * @param {API.MultihashDigest} hash
   * @returns {Promise<API.BlockIndexRecordView | null>}
   */
  async get(hash) {
    const filePath = this._getFilePath(hash)
    let encodedValue
    try {
      encodedValue = await fs.readFile(filePath)
    } catch (/** @type {any} */ err) {
      if (err.code === 'ENOENT') return null
      /* c8 ignore next 2 */
      throw err
    }
    return this.decodeData(encodedValue)
  }

  /**
   * Store an index entry.
   *
   * @param {API.MultihashDigest} hash
   * @param {API.BlockIndexRecordView} entry
   * @returns {Promise<void>}
   */
  async set(hash, entry) {
    const filePath = this._getFilePath(hash)
    const encodedValue = this.encodeData(entry)
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, encodedValue)
  }
}

export default FSBlockStore
