import { strict as assert } from 'assert'
import fs from 'fs'
import path from 'path'
import os from 'os'

import { equals } from 'uint8arrays'

import { FSBlockStore } from '../../src/store/fs-block.js'
import { BlockIndexRecord } from '../../src/record/block.js'

import { randomCID } from '../helpers/random.js'

describe('FSBlockStore', () => {
  /** @type {FSBlockStore} */
  let store
  /** @type {string} */
  let tempDir

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-block-test-'))
    store = new FSBlockStore(tempDir)
  })

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
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

  it('can store a block index record twice', async () => {
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
    await store.set(blockCid.multihash, record)
    const retrieved = await store.get(blockCid.multihash)

    assert(retrieved)
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
