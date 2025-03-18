import assert from 'assert'
import * as API from '../../src/api.js'

import { base58btc } from 'multiformats/bases/base58'

import { MemoryShardedDAGIndexStore } from '../../src/store/memory-sharded-dag.js'
import { ShardedDAGIndexRecord } from '../../src/record/sharded-dag.js'

import { randomCID } from '../helpers/random.js'

describe('MemoryShardedDAGIndexStore', () => {
  /** @type {MemoryShardedDAGIndexStore} */
  let store

  beforeEach(() => {
    store = new MemoryShardedDAGIndexStore()
  })

  it('can store and retrieve a sharded DAG index record', async () => {
    const content = /** @type {API.UnknownLink} */ (await randomCID())
    const record = new ShardedDAGIndexRecord(content)

    await store.set(content.multihash, record)
    const retrieved = await store.get(content.multihash)

    assert(retrieved)
    assert(retrieved.content.equals(content))
    assert.strictEqual(retrieved.shards.size, 0)
  })

  it('returns null for non-existent entries', async () => {
    const blockCid = await randomCID()
    const retrieved = await store.get(blockCid.multihash)
    assert.strictEqual(retrieved, null)
  })

  it('can handle entries with multiple shards and slices', async () => {
    const content = /** @type {API.UnknownLink} */ (await randomCID())
    const record = new ShardedDAGIndexRecord(content)
    const shardCid1 = await randomCID()
    const shardCid2 = await randomCID()
    const shardDigest1 = shardCid1.multihash
    const shardDigest2 = shardCid2.multihash
    const sliceCid1 = await randomCID()
    const sliceCid2 = await randomCID()
    const sliceDigest1 = sliceCid1.multihash
    const sliceDigest2 = sliceCid2.multihash
    const pos1 = /** @type {API.Position} */ ([0, 200])
    const pos2 = /** @type {API.Position} */ ([210, 300])

    record.setSlice(shardDigest1, sliceDigest1, pos1)
    record.setSlice(shardDigest2, sliceDigest2, pos2)

    await store.set(content.multihash, record)
    const retrieved = await store.get(content.multihash)

    assert(retrieved)
    assert(retrieved.content.equals(content))

    // Validate shards and positions
    const retrievedShard1 = Array.from(retrieved.shards.entries()).find(
      ([shard, _]) =>
        base58btc.encode(shard.bytes) === base58btc.encode(shardDigest1.bytes)
    )
    const retrievedShard2 = Array.from(retrieved.shards.entries()).find(
      ([shard, _]) =>
        base58btc.encode(shard.bytes) === base58btc.encode(shardDigest2.bytes)
    )

    assert(retrievedShard1)
    assert(retrievedShard2)
    assert(retrievedShard1.length)
    assert(retrievedShard2.length)
    assert(retrievedShard1[1].size === 1)
    assert(retrievedShard2[1].size === 1)

    assert.deepStrictEqual(retrievedShard1[1].values().next().value, pos1)
    assert.deepStrictEqual(retrievedShard2[1].values().next().value, pos2)
  })
})
