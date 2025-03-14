import assert from 'assert'
import { CarIndexer, CarBlockIterator } from '@ipld/car'
import { fromShardArchives } from '@web3-storage/blob-index/util'
import { equals } from 'uint8arrays'

import * as API from '../src/api.js'
import { MemoryShardedDAGIndexStore } from '../src/store/memory-sharded-dag.js'
import { MultipleLevelIndex } from '../src/multiple-level-index.js'
import { ShardedDAGIndexRecord } from '../src/record/sharded-dag.js'

import { randomCID, randomCAR } from './helpers/random.js'

describe('MultipleLevelIndex', () => {
  /** @type {MemoryShardedDAGIndexStore} */
  let store
  /** @type {MultipleLevelIndex} */
  let multipleLevelIndex

  beforeEach(() => {
    store = new MemoryShardedDAGIndexStore()
    multipleLevelIndex = new MultipleLevelIndex(store)
  })

  it('returns null when content CID is not provided', async () => {
    const multihash = (await randomCID()).multihash
    const location = await multipleLevelIndex.findBlockLocation(multihash)
    assert.strictEqual(location, null)
  })

  it('returns null for non-existent entries', async () => {
    const multihash = (await randomCID()).multihash
    const contentCid = await randomCID()
    const location = await multipleLevelIndex.findBlockLocation(multihash, {
      contextCid: contentCid,
    })
    assert.strictEqual(location, null)
  })

  it('finds block location for existing entries', async () => {
    const content = /** @type {API.UnknownLink} */ (await randomCID())
    const record = new ShardedDAGIndexRecord(content)
    const shardCid = await randomCID()
    const shardDigest = shardCid.multihash
    const sliceCid = await randomCID()
    const sliceDigest = sliceCid.multihash
    const pos = /** @type {API.Position} */ ([0, 200])

    record.setSlice(shardDigest, sliceDigest, pos)
    await store.set(content.multihash, record)

    const location = await multipleLevelIndex.findBlockLocation(sliceDigest, {
      contextCid: content,
    })
    assert(location)
    assert(equals(location.container.digest, shardDigest.digest))
    assert.strictEqual(location.offset, pos[0])
    assert.strictEqual(location.length, pos[1])
  })

  it('finds containers for existing entries', async () => {
    const content = /** @type {API.UnknownLink} */ (await randomCID())
    const record = new ShardedDAGIndexRecord(content)
    const shardCid1 = await randomCID()
    const shardCid2 = await randomCID()
    const shardDigest1 = shardCid1.multihash
    const shardDigest2 = shardCid2.multihash

    record.setSlice(shardDigest1, (await randomCID()).multihash, [0, 200])
    record.setSlice(shardDigest2, (await randomCID()).multihash, [210, 300])
    await store.set(content.multihash, record)

    const containers = await multipleLevelIndex.findContainers(
      content.multihash
    )
    assert(containers)
    assert.strictEqual(containers.contentCID.equals(content), true)
    assert.deepStrictEqual(containers.shards, [shardDigest1, shardDigest2])
  })

  it('returns null for non-existent containers', async () => {
    const multihash = (await randomCID()).multihash
    const containers = await multipleLevelIndex.findContainers(multihash)
    assert.strictEqual(containers, null)
  })

  it('returns null when no matching slice is found', async () => {
    const content = /** @type {API.UnknownLink} */ (await randomCID())
    const record = new ShardedDAGIndexRecord(content)
    const shardCid = await randomCID()
    const shardDigest = shardCid.multihash
    const sliceCid = await randomCID()
    const sliceDigest = sliceCid.multihash
    const pos = /** @type {API.Position} */ ([0, 200])

    record.setSlice(shardDigest, sliceDigest, pos)
    await store.set(content.multihash, record)

    const nonMatchingMultihash = (await randomCID()).multihash
    const location = await multipleLevelIndex.findBlockLocation(
      nonMatchingMultihash,
      {
        contextCid: content,
      }
    )
    assert.strictEqual(location, null)
  })

  it('can index a container and find block locations', async () => {
    const car = await randomCAR(4100, { chunkSize: 2000 })
    const root = car.roots[0]
    if (!root) throw new Error('No root CID found')

    const carBytes = new Uint8Array(await car.arrayBuffer())
    const carIndexer = await CarIndexer.fromBytes(carBytes)

    // Index the container
    await multipleLevelIndex.indexContainer(carIndexer, car.cid.multihash, {
      contextCid: root,
    })

    // Get containers for the context CID
    const containers = await multipleLevelIndex.findContainers(root.multihash)
    assert(containers)
    assert.strictEqual(containers.contentCID.equals(root), true)
    assert.strictEqual(containers.shards.length, 1)
    assert(equals(containers.shards[0].digest, car.cid.multihash.digest))

    // Create block iterator and verify all blocks were indexed
    const blockIterator = await CarBlockIterator.fromBytes(carBytes)
    let blockCount = 0
    for await (const block of blockIterator) {
      const location = await multipleLevelIndex.findBlockLocation(
        block.cid.multihash,
        {
          contextCid: root,
        }
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
        const location = await multipleLevelIndex.findBlockLocation(
          blockDigest,
          {
            contextCid: root,
          }
        )

        assert(location)
        assert(equals(location.container.digest, car.cid.multihash.digest))
        assert.strictEqual(location.offset, position[0])
        assert.strictEqual(location.length, position[1])
      }
    }
  })

  it('can index two containers under same context and find block locations', async () => {
    const car = await randomCAR(4100, { chunkSize: 2000 })
    const car2 = await randomCAR(1000)
    const root = car.roots[0]
    if (!root) throw new Error('No root CID found')

    const carBytes = new Uint8Array(await car.arrayBuffer())
    const car2Bytes = new Uint8Array(await car2.arrayBuffer())
    const carIndexer = await CarIndexer.fromBytes(carBytes)
    const car2Indexer = await CarIndexer.fromBytes(car2Bytes)

    // Index CARs with same root
    await multipleLevelIndex.indexContainer(carIndexer, car.cid.multihash, {
      contextCid: root,
    })
    await multipleLevelIndex.indexContainer(car2Indexer, car2.cid.multihash, {
      contextCid: root,
    })

    // Get containers for the context CID
    const containers = await multipleLevelIndex.findContainers(root.multihash)
    assert(containers)
    assert.strictEqual(containers.contentCID.equals(root), true)
    assert.strictEqual(containers.shards.length, 2)
    assert(equals(containers.shards[0].digest, car.cid.multihash.digest))
    assert(equals(containers.shards[1].digest, car2.cid.multihash.digest))

    // Create block iterator and verify all blocks were indexed for each car
    await Promise.all(
      [
        { carBytes, car: car },
        { carBytes: car2Bytes, car: car2 },
      ].map(async ({ carBytes, car }) => {
        const blockIterator = await CarBlockIterator.fromBytes(carBytes)
        for await (const block of blockIterator) {
          const location = await multipleLevelIndex.findBlockLocation(
            block.cid.multihash,
            {
              contextCid: root,
            }
          )
          assert(location)
          assert(equals(location.container.digest, car.cid.multihash.digest))
          assert(location.offset)
          assert(location.length)
        }
      })
    )

    // Create an index with other library to compare results
    await Promise.all(
      [
        { carBytes, car: car },
        { carBytes: car2Bytes, car: car2 },
      ].map(async ({ carBytes, car }) => {
        const index = await fromShardArchives(root, [carBytes])
        for (const [shardDigest, slices] of index.shards.entries()) {
          assert(equals(shardDigest.digest, car.cid.multihash.digest))

          for (const [blockDigest, position] of slices.entries()) {
            const location = await multipleLevelIndex.findBlockLocation(
              blockDigest,
              {
                contextCid: root,
              }
            )

            assert(location)
            assert(equals(location.container.digest, car.cid.multihash.digest))
            assert.strictEqual(location.offset, position[0])
            assert.strictEqual(location.length, position[1])
          }
        }
      })
    )
  })

  it('throws an error when context CID is not provided during indexing', async () => {
    const car = await randomCAR(4100, { chunkSize: 2000 })
    const carBytes = new Uint8Array(await car.arrayBuffer())
    const carIndexer = await CarIndexer.fromBytes(carBytes)

    await assert.rejects(
      multipleLevelIndex.indexContainer(carIndexer, car.cid.multihash),
      {
        message: 'Context CID is required',
      }
    )
  })
})
