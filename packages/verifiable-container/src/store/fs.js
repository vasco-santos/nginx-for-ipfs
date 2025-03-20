import * as API from '../api.js'

import { base58btc } from 'multiformats/bases/base58'

import { promises as fs } from 'fs'
import path from 'path'

/**
 * File system implementation of ContainerStore
 *
 * @implements {API.ContainerStore}
 */
export class FSContainerStore {
  /**
   * @param {string} directory - Directory to store containers files.
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
    return path.join(this.directory, FSContainerStore.encodeKey(hash))
  }

  /**
   * Put a container file.
   *
   * @param {API.MultihashDigest} hash - The Multihash digest of the container.
   * @param {Uint8Array} data - The container file bytes.
   */
  async put(hash, data) {
    const filePath = this._getFilePath(hash)
    await fs.writeFile(filePath, data)
  }

  /**
   * Retrieves bytes of a container file by its multihash digest.
   *
   * @param {API.MultihashDigest} hash - The Multihash digest of the container.
   * @returns {Promise<Uint8Array | null>}
   */
  async get(hash) {
    const filePath = this._getFilePath(hash)
    try {
      return await fs.readFile(filePath)
    } catch {
      return null
    }
  }
}
