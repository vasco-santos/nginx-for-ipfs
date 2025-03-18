import assert from 'assert'

import { equals } from 'uint8arrays'

import { MemoryBlockIndexStore } from '../../src/store/memory-block.js'
import { BlockIndexRecord } from '../../src/record/block.js'

import { randomCID } from '../helpers/random.js'

describe('MemoryBlockIndexStore', () => {
  /** @type {MemoryBlockIndexStore} */
  let store

  beforeEach(() => {
    store = new MemoryBlockIndexStore()
  })

  it('can store and retrieve a block index record', async () => {
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
    const retrieved = await store.get(blockCid.multihash)

    assert(retrieved)
    assert.strictEqual(retrieved.offset, offset)
    assert.strictEqual(retrieved.length, length)
    assert(equals(retrieved.multihash.digest, blockCid.multihash.digest))
    assert(equals(retrieved.container.digest, containerCid.multihash.digest))
  })

  it('returns null for non-existent entries', async () => {
    const blockCid = await randomCID()
    const retrieved = await store.get(blockCid.multihash)
    assert.strictEqual(retrieved, null)
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

    await store.set(blockCid.multihash, record)
    const retrieved = await store.get(blockCid.multihash)

    assert(retrieved)
    assert.strictEqual(retrieved.offset, offset)
    assert.strictEqual(retrieved.length, length)
    assert(equals(retrieved.multihash.digest, blockCid.multihash.digest))
    assert(equals(retrieved.container.digest, containerCid.multihash.digest))
  })
})
