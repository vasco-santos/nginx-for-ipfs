import { strict as assert } from 'assert'
import fs from 'fs'
import path from 'path'
import os from 'os'

import { base58btc } from 'multiformats/bases/base58'

import * as API from '../../src/api.js'
import { FSShardedDAG } from '../../src/store/fs-sharded-dag.js'
import { ShardedDAGIndexRecord } from '../../src/record/sharded-dag.js'

import { randomCID } from '../helpers/random.js'
import { UnknownFormat, DecodeFailure } from '../../src/store/fs-sharded-dag.js'

describe('FSShardedDAG', () => {
  /** @type {FSShardedDAG} */
  let store
  /** @type {string} */
  let tempDir

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-block-test-'))
    store = new FSShardedDAG(tempDir)
  })

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
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

  it('can store a sharded DAG index twice', async () => {
    const content = /** @type {API.UnknownLink} */ (await randomCID())
    const record = new ShardedDAGIndexRecord(content)

    await store.set(content.multihash, record)
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

  it('can handle large offsets and lengths', async () => {
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

  it('can store a sharded DAG index twice with shards', async () => {
    const content = /** @type {API.UnknownLink} */ (await randomCID())
    const record = new ShardedDAGIndexRecord(content)

    const shardCid1 = await randomCID()
    const shardDigest1 = shardCid1.multihash
    const sliceCid1 = await randomCID()
    const sliceDigest1 = sliceCid1.multihash
    const pos1 = /** @type {API.Position} */ ([0, 200])

    record.setSlice(shardDigest1, sliceDigest1, pos1)
    record.setSlice(shardDigest1, sliceDigest1, pos1)

    await store.set(content.multihash, record)
    await store.set(content.multihash, record)
    const retrieved = await store.get(content.multihash)

    assert(retrieved)
    assert(retrieved.content.equals(content))
    assert.strictEqual(retrieved.shards.size, 1)
  })
})
describe('FSShardedDAG - Error Handling', () => {
  it('UnknownFormat should correctly store and retrieve error details', () => {
    const message = 'Unknown format encountered'
    const error = new UnknownFormat(message)

    assert.equal(error.describe(), message)
    assert(error instanceof Error)
  })

  it('DecodeFailure should correctly store and retrieve error details', () => {
    const message = 'Failed to decode data'
    const error = new DecodeFailure(message)

    assert.equal(error.describe(), message)
    assert(error instanceof Error)
  })
})
describe('FSShardedDAG - Data Encoding and Decoding', () => {
  /** @type {FSShardedDAG} */
  let store
  /** @type {string} */
  let tempDir

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-block-test-'))
    store = new FSShardedDAG(tempDir)
  })

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('encodeData should correctly encode a ShardedDAGIndexRecord', async () => {
    const content = /** @type {API.UnknownLink} */ (await randomCID())
    const record = new ShardedDAGIndexRecord(content)
    const shardCid = await randomCID()
    const sliceCid = await randomCID()
    const shardDigest = shardCid.multihash
    const sliceDigest = sliceCid.multihash
    const position = /** @type {API.Position} */ ([0, 100])

    record.setSlice(shardDigest, sliceDigest, position)

    const encoded = await store.encodeData(record)
    assert(encoded instanceof Uint8Array)
    assert(encoded.length > 0)
  })

  it('decodeData should correctly decode an encoded ShardedDAGIndexRecord', async () => {
    const content = /** @type {API.UnknownLink} */ (await randomCID())
    const record = new ShardedDAGIndexRecord(content)
    const shardCid = await randomCID()
    const sliceCid = await randomCID()
    const shardDigest = shardCid.multihash
    const sliceDigest = sliceCid.multihash
    const position = /** @type {API.Position} */ ([0, 100])

    record.setSlice(shardDigest, sliceDigest, position)

    assert(record.shards.size === 1)
    assert(record.shards.get(shardDigest).size === 1)

    const encoded = await store.encodeData(record)
    const decoded = store.decodeData(encoded)

    assert(decoded instanceof ShardedDAGIndexRecord)
    assert(decoded.content.equals(content))
    assert(decoded.shards.size === 1)

    const retrievedShard = Array.from(decoded.shards.entries()).find(
      ([shard, _]) =>
        base58btc.encode(shard.bytes) === base58btc.encode(shardDigest.bytes)
    )

    assert(retrievedShard)
    assert(retrievedShard.length)
    assert(retrievedShard[1].size === 1)
    assert.deepStrictEqual(retrievedShard[1].values().next().value, position)

    // Add same shard to the record and guarantee only one exists
    decoded.setSlice(shardDigest, sliceDigest, position)
    assert(decoded.shards.size === 1)
    assert(decoded.shards.get(shardDigest).size === 1)

    // Add a new slice to the record and guarantee it is added
    const newSliceCid = await randomCID()
    const newSliceDigest = newSliceCid.multihash
    const newPosition = /** @type {API.Position} */ ([200, 300])
    decoded.setSlice(shardDigest, newSliceDigest, newPosition)
    assert(decoded.shards.size === 1)
    assert(decoded.shards.get(shardDigest).size === 2)
  })

  it('decodeData should throw an error for invalid data', () => {
    const invalidData = new Uint8Array([0, 1, 2, 3, 4, 5])

    assert.throws(() => {
      store.decodeData(invalidData)
    })
  })
})
