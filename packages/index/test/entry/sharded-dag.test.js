import assert from 'assert'

import {
  ShardedDAGIndexRecord,
  createFromIndexRecordEntry,
  type,
} from '../../src/record/sharded-dag.js'
import * as API from '../../src/api.js'

import { randomCID } from '../helpers/random.js'

describe('ShardedDAGIndexRecord', () => {
  it('should initialize with content and empty shards', async () => {
    const content = /** @type {API.UnknownLink} */ (await randomCID())
    const record = new ShardedDAGIndexRecord(content)
    assert(record.content.equals(content))
    assert.strictEqual(record.shards.size, 0)
  })

  it('should set slice correctly', async () => {
    const content = /** @type {API.UnknownLink} */ (await randomCID())
    const record = new ShardedDAGIndexRecord(content)
    const shardCid = await randomCID()
    const sliceCid = await randomCID()
    const shardDigest = shardCid.multihash
    const sliceDigest = sliceCid.multihash
    const pos = /** @type {API.Position} */ ([0, 100])

    record.setSlice(shardDigest, sliceDigest, pos)
    assert.strictEqual(record.shards.get(shardDigest).get(sliceDigest), pos)
  })

  it('should set slice once for the same shard and slice', async () => {
    const content = /** @type {API.UnknownLink} */ (await randomCID())
    const record = new ShardedDAGIndexRecord(content)
    const shardCid = await randomCID()
    const sliceCid = await randomCID()
    const shardDigest = shardCid.multihash
    const sliceDigest = sliceCid.multihash
    const pos1 = /** @type {API.Position} */ ([0, 100])
    const pos2 = /** @type {API.Position} */ ([150, 200])

    record.setSlice(shardDigest, sliceDigest, pos1)
    record.setSlice(shardDigest, sliceDigest, pos2)

    // Ensure the slice position is updated to the latest value
    assert.strictEqual(record.shards.get(shardDigest).get(sliceDigest), pos2)
    assert.strictEqual(record.shards.get(shardDigest).size, 1)
    assert.strictEqual(record.shards.size, 1)
  })

  it('should convert to IndexRecordEntry correctly', async () => {
    const content = /** @type {API.UnknownLink} */ (await randomCID())
    const record = new ShardedDAGIndexRecord(content)
    const entry = record.toIndexRecordEntry()
    assert.strictEqual(entry.type, type)
    assert.deepStrictEqual(entry.data, record)
  })

  it('should handle multiple slices for the same shard', async () => {
    const content = /** @type {API.UnknownLink} */ (await randomCID())
    const record = new ShardedDAGIndexRecord(content)
    const shardCid = await randomCID()
    const shardDigest = shardCid.multihash
    const sliceCid1 = await randomCID()
    const sliceCid2 = await randomCID()
    const sliceDigest1 = sliceCid1.multihash
    const sliceDigest2 = sliceCid2.multihash
    const pos1 = /** @type {API.Position} */ ([0, 200])
    const pos2 = /** @type {API.Position} */ ([210, 300])

    record.setSlice(shardDigest, sliceDigest1, pos1)
    record.setSlice(shardDigest, sliceDigest2, pos2)
    assert.deepStrictEqual(
      record.shards.get(shardDigest).get(sliceDigest1),
      pos1
    )
    assert.deepStrictEqual(
      record.shards.get(shardDigest).get(sliceDigest2),
      pos2
    )
  })

  it('should handle multiple shards', async () => {
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

    assert.deepStrictEqual(
      record.shards.get(shardDigest1).get(sliceDigest1),
      pos1
    )
    assert.deepStrictEqual(
      record.shards.get(shardDigest2).get(sliceDigest2),
      pos2
    )
  })

  it('should create a record from a valid IndexRecordEntry', async () => {
    const content = /** @type {API.UnknownLink} */ (await randomCID())
    const record = new ShardedDAGIndexRecord(content)
    const shardCid = await randomCID()
    const sliceCid = await randomCID()
    const shardDigest = shardCid.multihash
    const sliceDigest = sliceCid.multihash
    const pos = /** @type {API.Position} */ ([0, 100])

    record.setSlice(shardDigest, sliceDigest, pos)
    const entry = record.toIndexRecordEntry()

    const recreatedRecord = createFromIndexRecordEntry(entry)
    assert(recreatedRecord.content.equals(content))
    assert.strictEqual(recreatedRecord.shards.size, 1)
    assert.strictEqual(
      recreatedRecord.shards.get(shardDigest)?.get(sliceDigest),
      pos
    )
  })

  it('should throw an error for an invalid IndexRecordEntry type', () => {
    const invalidEntry = {
      type: 'invalid/type',
      data: {},
    }

    assert.throws(() => {
      // @ts-expect-error invalid entry type
      createFromIndexRecordEntry(invalidEntry)
    }, /Invalid entry type/)
  })

  it('should handle multiple shards and slices in IndexRecordEntry', async () => {
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
    const entry = record.toIndexRecordEntry()

    const recreatedRecord = createFromIndexRecordEntry(entry)
    assert(recreatedRecord.content.equals(content))
    assert.strictEqual(recreatedRecord.shards.size, 2)
    assert.strictEqual(
      recreatedRecord.shards.get(shardDigest1)?.get(sliceDigest1),
      pos1
    )
    assert.strictEqual(
      recreatedRecord.shards.get(shardDigest2)?.get(sliceDigest2),
      pos2
    )
  })
})
