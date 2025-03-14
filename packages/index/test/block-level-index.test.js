import assert from 'assert'

import { CarIndexer, CarBlockIterator } from '@ipld/car'
import { fromShardArchives } from '@web3-storage/blob-index/util'
import { equals } from 'uint8arrays'

import { MemoryBlockIndexStore } from '../src/store/memory-block.js'
import { BlockLevelIndex } from '../src/block-level-index.js'
import { BlockIndexRecord } from '../src/record/block.js'

import { randomCID, randomCAR } from './helpers/random.js'

describe('BlockLevelIndex', () => {
  /** @type {MemoryBlockIndexStore} */
  let store
  /** @type {BlockLevelIndex} */
  let blockLevelIndex

  beforeEach(() => {
    store = new MemoryBlockIndexStore()
    blockLevelIndex = new BlockLevelIndex(store)
  })

  it('can find the location of a stored block', async () => {
    const blockCid = await randomCID()
    const containerCid = await randomCID()
    const offset = 0
    const length = 100

    const record = new BlockIndexRecord(
      blockCid.multihash,
      containerCid.multihash,
      offset,
      length
    )

    await store.set(blockCid.multihash, record)
    const location = await blockLevelIndex.findBlockLocation(blockCid.multihash)

    assert(location)
    assert.strictEqual(location.offset, offset)
    assert.strictEqual(location.length, length)
    assert(equals(location.container.digest, containerCid.multihash.digest))
  })

  it('returns null for non-existent block locations', async () => {
    const blockCid = await randomCID()
    const location = await blockLevelIndex.findBlockLocation(blockCid.multihash)
    assert.strictEqual(location, null)
  })

  it('returns null for container search as it is not supported', async () => {
    const blockCid = await randomCID()
    const containers = await blockLevelIndex.findContainers(blockCid.multihash)
    assert.strictEqual(containers, null)
  })

  it('can handle large offsets and lengths in block locations', async () => {
    const blockCid = await randomCID()
    const containerCid = await randomCID()
    const offset = Number.MAX_SAFE_INTEGER
    const length = Number.MAX_SAFE_INTEGER

    const record = new BlockIndexRecord(
      blockCid.multihash,
      containerCid.multihash,
      offset,
      length
    )

    await store.set(blockCid.multihash, record)
    const location = await blockLevelIndex.findBlockLocation(blockCid.multihash)

    assert(location)
    assert.strictEqual(location.offset, offset)
    assert.strictEqual(location.length, length)
    assert(equals(location.container.digest, containerCid.multihash.digest))
  })

  it('can index a container and find block locations', async () => {
    const car = await randomCAR(4100, { chunkSize: 2000 })
    const root = car.roots[0]
    if (!root) throw new Error('No root CID found')

    const carBytes = new Uint8Array(await car.arrayBuffer())
    const carIndexer = await CarIndexer.fromBytes(carBytes)

    await blockLevelIndex.indexContainer(carIndexer, car.cid.multihash)

    // Create block iterator and verify all blocks were indexed
    const blockIterator = await CarBlockIterator.fromBytes(carBytes)
    let blockCount = 0
    for await (const block of blockIterator) {
      const location = await blockLevelIndex.findBlockLocation(
        block.cid.multihash
      )
      assert(location)
      assert(equals(location.container.digest, car.cid.multihash.digest))
      assert(location.offset)
      assert(location.length)

      blockCount++
    }

    // Create an index with other library to compare results
    const index = await fromShardArchives(root, [carBytes])
    for (const [shardDigest, slices] of index.shards.entries()) {
      assert.strictEqual(slices.size, blockCount)
      assert(equals(shardDigest.digest, car.cid.multihash.digest))

      for (const [blockDigest, position] of slices.entries()) {
        const location = await blockLevelIndex.findBlockLocation(blockDigest)

        assert(location)
        assert(equals(location.container.digest, car.cid.multihash.digest))
        assert.strictEqual(location.offset, position[0])
        assert.strictEqual(location.length, position[1])
      }
    }
  })
})
