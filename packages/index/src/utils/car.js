/* c8 ignore start */
import * as API from '../api.js'

import { CarBufferReader } from '@ipld/car/buffer-reader'
import * as CarBufferWriter from '@ipld/car/buffer-writer'
import { base32 } from 'multiformats/bases/base32'

// @see https://www.iana.org/assignments/media-types/application/vnd.ipld.car
export const contentType = 'application/vnd.ipld.car'
export const name = 'CAR'

/** @type {API.MulticodecCode<0x0202, 'CAR'>} */
export const code = 0x0202

/**
 * @typedef {{
 * roots: API.IPLDBlock[]
 * blocks: Map<string, API.IPLDBlock>
 * }} Model
 */

class Writer {
  /**
   * @param {API.IPLDBlock[]} blocks
   * @param {number} byteLength
   */
  constructor(blocks = [], byteLength = 0) {
    this.written = new Set()
    this.blocks = blocks
    this.byteLength = byteLength
  }
  /**
   * @param {API.IPLDBlock[]} blocks
   */
  write(...blocks) {
    for (const block of blocks) {
      const id = block.cid.toString(base32)
      if (!this.written.has(id)) {
        this.blocks.push(block)
        this.byteLength += CarBufferWriter.blockLength(
          /** @type {any} */ (block)
        )
        this.written.add(id)
      }
    }
    return this
  }
  /**
   * @param {API.IPLDBlock[]} rootBlocks
   */
  flush(...rootBlocks) {
    const roots = []
    // We reverse the roots so that the first root is the last block in the CAR
    for (const block of rootBlocks.reverse()) {
      const id = block.cid.toString(base32)
      if (!this.written.has(id)) {
        this.blocks.unshift(block)
        this.byteLength += CarBufferWriter.blockLength({
          cid: /** @type {CarBufferWriter.CID} */ (block.cid),
          bytes: block.bytes,
        })
        this.written.add(id)
      }

      // We unshift here because we want to preserve the order of the roots
      roots.unshift(/** @type {CarBufferWriter.CID} */ (block.cid))
    }

    this.byteLength += CarBufferWriter.headerLength({ roots })

    const buffer = new ArrayBuffer(this.byteLength)
    const writer = CarBufferWriter.createWriter(buffer, { roots })

    for (const block of /** @type {CarBufferWriter.Block[]} */ (this.blocks)) {
      writer.write(block)
    }

    return writer.close()
  }
}

export const createWriter = () => new Writer()

/**
 * @template {Partial<Model>} T
 * @param {T} input
 * @returns {API.ByteView<T>}
 */
export const encode = ({ roots = [], blocks }) => {
  const writer = new Writer()
  if (blocks) {
    writer.write(...blocks.values())
  }
  return writer.flush(...roots)
}

/**
 * @param {API.ByteView<Partial<Model>>} bytes
 * @returns {Model}
 */
export const decode = (bytes) => {
  const reader = CarBufferReader.fromBytes(bytes)
  /** @type {API.IPLDBlock[]} */
  const roots = []
  const blocks = new Map()

  for (const root of reader.getRoots()) {
    const block = /** @type {API.IPLDBlock} */ (reader.get(root))
    if (block) {
      roots.push(block)
    }
  }

  for (const block of reader.blocks()) {
    blocks.set(block.cid.toString(), block)
  }

  return { roots, blocks }
}

/* c8 ignore stop */
