import * as API from '../api.js'

import fs from 'fs/promises'
import path from 'path'

import { base58btc } from 'multiformats/bases/base58'
import * as dagCBOR from '@ipld/dag-cbor'
import { sha256 } from 'multiformats/hashes/sha2'
import * as Link from 'multiformats/link'
import { compare } from 'uint8arrays'
import * as Digest from 'multiformats/hashes/digest'

import { ShardedDAGIndexRecord } from '../record/sharded-dag.js'
import * as CAR from '../utils/car.js'

export const version = 'index/sharded/dag@0.1'

// TODO: Consider to rely on blob-index directly?

/**
 * FS implementation of ShardedDAGIndexStore
 *
 * @implements {API.IndexStore<API.ShardedDAGIndexRecordView>}
 */
export class FSShardedDAG {
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
    return path.join(this.directory, FSShardedDAG.encodeKey(hash))
  }

  /**
   * @param {API.ShardedDAGIndexRecordView} data
   */
  async encodeData(data) {
    const blocks = new Map()
    const shards = [...data.shards.entries()].sort((a, b) =>
      compare(a[0].digest, b[0].digest)
    )
    const index = {
      content: data.content,
      shards: /** @type {API.UnknownLink[]} */ ([]),
    }
    for (const s of shards) {
      const slices = [...s[1].entries()]
        .sort((a, b) => compare(a[0].digest, b[0].digest))
        .map((e) => [e[0].bytes, e[1]])
      const bytes = dagCBOR.encode([s[0].bytes, slices])
      const digest = await sha256.digest(bytes)
      const cid = Link.create(dagCBOR.code, digest)
      blocks.set(cid.toString(), { cid, bytes })
      index.shards.push(cid)
    }
    const bytes = dagCBOR.encode({ [version]: index })
    const digest = await sha256.digest(bytes)
    const cid = Link.create(dagCBOR.code, digest)
    return CAR.encode({ roots: [{ cid, bytes }], blocks })
  }

  /**
   * @param {Uint8Array} archive
   * @returns {API.ShardedDAGIndexRecordView}
   */
  decodeData(archive) {
    const { roots, blocks } = CAR.decode(archive)

    /* c8 ignore next 3 */
    if (!roots.length) {
      throw new UnknownFormat('missing root block')
    }

    const { code } = roots[0].cid
    /* c8 ignore next 5 */
    if (code !== dagCBOR.code) {
      throw new UnknownFormat(
        `unexpected root CID codec: 0x${code.toString(16)}`
      )
    }

    const decodedRootBlock = dagCBOR.decode(roots[0].bytes)
    const dagVersion = Object.keys(decodedRootBlock)[0]
    const dagIndexData = decodedRootBlock[dagVersion]

    switch (dagVersion) {
      case version: {
        const record = new ShardedDAGIndexRecord(dagIndexData.content)
        for (const shardLink of dagIndexData.shards) {
          const shard = blocks.get(shardLink.toString())
          /* c8 ignore next 3 */
          if (!shard) {
            throw new DecodeFailure(`missing shard block: ${shardLink}`)
          }

          const shardData = dagCBOR.decode(shard.bytes)
          for (const [digest, [offset, length]] of shardData[1]) {
            record.setSlice(
              Digest.decode(shardData[0]),
              Digest.decode(digest),
              [offset, length]
            )
          }
        }
        return record
      }
      /* c8 ignore next 3 */
      default: {
        throw new UnknownFormat(`unknown index version: ${dagVersion}`)
      }
    }
  }

  /**
   * Store an index entry.
   *
   * @param {API.MultihashDigest} hash
   * @param {API.ShardedDAGIndexRecordView} entry
   * @returns {Promise<void>}
   */
  async set(hash, entry) {
    const filePath = this._getFilePath(hash)
    const encodedValue = await this.encodeData(entry)
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, encodedValue)
  }

  /**
   * @param {API.MultihashDigest} hash
   * @returns {Promise<API.ShardedDAGIndexRecordView | null>}
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
}

export default FSShardedDAG

export class UnknownFormat extends Error {
  #reason

  /** @param {string} [reason] */
  constructor(reason) {
    super()
    this.name = /** @type {const} */ ('UnknownFormat')
    this.#reason = reason
  }

  describe() {
    /* c8 ignore next 1 */
    return this.#reason ?? 'unknown format'
  }
}

export class DecodeFailure extends Error {
  #reason

  /** @param {string} [reason] */
  constructor(reason) {
    super()
    this.name = /** @type {const} */ ('DecodeFailure')
    this.#reason = reason
  }

  describe() {
    /* c8 ignore next 1 */
    return this.#reason ?? 'failed to decode'
  }
}
