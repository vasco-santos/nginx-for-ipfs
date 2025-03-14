import * as API from './api.js'
import { equals } from 'uint8arrays/equals'

import { ShardedDAGIndexRecord } from './record/sharded-dag.js'

/**
 * @typedef {import('@ipld/car/indexer').BlockIndex} BlockIndex
 */

/**
 * MultipleLevelIndex implements the Index interface
 * and provides methods to locate blocks and containers in a sharded DAG.
 *
 * @implements {API.Index<API.ShardedDAGIndexRecordView>}
 */
export class MultipleLevelIndex {
  /**
   * @param {API.IndexStore<API.ShardedDAGIndexRecordView>} store - The store where the index is maintained.
   */
  constructor(store) {
    this.store = store
  }

  /**
   * Indexes a given container (CAR File).
   *
   * @param {AsyncIterable<BlockIndex>} blockIterable
   * @param {API.MultihashDigest} containerMultihash - The container multihash.
   * @param {object} [options]
   * @param {API.UnknownLink} [options.contextCid] - The context where this CID belongs to.
   * @returns {Promise<void>}
   */
  async indexContainer(blockIterable, containerMultihash, { contextCid } = {}) {
    if (!contextCid) {
      throw new Error('Context CID is required')
    }

    let record = await this.store.get(contextCid.multihash)
    if (!record) {
      record = new ShardedDAGIndexRecord(contextCid)
    }

    for await (const { cid, blockOffset, blockLength } of blockIterable) {
      record.setSlice(containerMultihash, cid.multihash, [
        blockOffset,
        blockLength,
      ])
    }

    await this.store.set(contextCid.multihash, record)
  }

  /**
   * Find the location of a given block by its multihash.
   *
   * @param {API.MultihashDigest} multihash
   * @param {object} [options]
   * @param {API.UnknownLink} [options.contextCid] - The context where this CID belongs to.
   * @returns {Promise<API.BlockLocation | null>}
   */
  async findBlockLocation(multihash, { contextCid } = {}) {
    if (!contextCid) {
      return null
    }

    const entry = await this.store.get(contextCid.multihash)
    if (entry) {
      for (const [shardDigest, slices] of entry.shards.entries()) {
        for (const [sliceDigest, position] of slices.entries()) {
          if (equals(sliceDigest.bytes, multihash.bytes)) {
            return {
              container: shardDigest,
              offset: position[0],
              length: position[1],
            }
          }
        }
      }
    }
    return null
  }

  /**
   * Find all containers that hold a given content multihash.
   *
   * @param {API.MultihashDigest} multihash
   * @returns {Promise<API.ContentLocation | null>}
   */
  async findContainers(multihash) {
    const entry = await this.store.get(multihash)
    if (!entry) {
      return null
    }
    return {
      contentCID: entry.content,
      shards: Array.from(entry.shards.keys()),
    }
  }
}
