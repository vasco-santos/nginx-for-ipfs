import * as API from './api.js'

import { BlockIndexRecord } from './record/block.js'

/**
 * @typedef {import('@ipld/car/indexer').BlockIndex} BlockIndex
 */

/**
 * BlockLevelIndex implements the Index interface
 * and provides methods to locate blocks and containers.
 *
 * @implements {API.Index<API.BlockIndexRecord>}
 */
export class BlockLevelIndex {
  /**
   * @param {API.IndexStore<API.BlockIndexRecord>} store - The store where the index is maintained.
   */
  constructor(store) {
    this.store = store
  }

  /**
   * Indexes a given container blocks
   *
   * @param {AsyncIterable<BlockIndex>} blockIterable
   * @param {API.MultihashDigest} containerMultihash - The container multihash
   * @returns {Promise<void>}
   */
  async indexContainer(blockIterable, containerMultihash) {
    for await (const { cid, blockOffset, blockLength } of blockIterable) {
      const record = new BlockIndexRecord(
        cid.multihash,
        containerMultihash,
        blockOffset,
        blockLength
      )
      await this.store.set(cid.multihash, record)
    }
  }

  /**
   * Find the location of a given block by its multihash.
   *
   * @param {API.MultihashDigest} multihash
   * @returns {Promise<API.BlockLocation | null>}
   */
  async findBlockLocation(multihash) {
    return await this.store.get(multihash)
  }

  /**
   * Find all containers that hold a given content multihash.
   *
   * @param {API.MultihashDigest} multihash
   * @returns {Promise<API.ContentLocation | null>}
   */
  async findContainers(multihash) {
    // Since BlockLevelIndex does not track entire content DAGs, return not found
    return null
  }
}
