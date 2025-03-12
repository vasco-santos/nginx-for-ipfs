import assert from 'assert'
import { equals } from 'uint8arrays'

import {
  BlockIndexRecord,
  createFromIndexRecordEntry,
  type,
} from '../../src/record/block.js'

import { randomCID } from '../helpers/random.js'

describe('BlockIndexRecord', () => {
  it('can create a block index record', async () => {
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

    assert.strictEqual(record.offset, offset)
    assert.strictEqual(record.length, length)
    assert(equals(record.multihash.digest, blockCid.multihash.digest))
    assert(equals(record.container.digest, containerCid.multihash.digest))

    const entry = record.toIndexRecordEntry()
    assert.strictEqual(entry.type, type)
    assert.strictEqual(entry.data, record)
  })

  it('can convert to index entry', async () => {
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

    const entry = record.toIndexRecordEntry()
    assert.strictEqual(entry.type, type)
    assert.strictEqual(entry.data, record)
  })

  it('can handle large offsets and lengths', async () => {
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

    assert.strictEqual(record.offset, offset)
    assert.strictEqual(record.length, length)
    assert(equals(record.multihash.digest, blockCid.multihash.digest))
    assert(equals(record.container.digest, containerCid.multihash.digest))

    const entry = record.toIndexRecordEntry()
    assert.strictEqual(entry.type, type)
    assert.strictEqual(entry.data, record)
  })

  it('can create a BlockIndexRecord from a valid IndexRecordEntry', async () => {
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

    const entry = record.toIndexRecordEntry()
    const recreatedRecord = createFromIndexRecordEntry(entry)

    assert.strictEqual(recreatedRecord.offset, offset)
    assert.strictEqual(recreatedRecord.length, length)
    assert(equals(recreatedRecord.multihash.digest, blockCid.multihash.digest))
    assert(
      equals(recreatedRecord.container.digest, containerCid.multihash.digest)
    )
  })

  it('throws an error when creating from an invalid IndexRecordEntry type', () => {
    const invalidEntry = {
      type: 'invalid/type',
      data: {},
    }

    assert.throws(() => {
      // @ts-expect-error invalid entry type
      createFromIndexRecordEntry(invalidEntry)
    }, /Invalid entry type/)
  })

  it('throws an error when creating from an IndexRecordEntry with missing data', () => {
    const invalidEntry = {
      type,
      data: null,
    }

    assert.throws(() => {
      // @ts-expect-error invalid entry type
      createFromIndexRecordEntry(invalidEntry)
    }, /Cannot read properties of null/)
  })
})
