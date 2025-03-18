import {
  ByteView,
  MultihashDigest,
  UnknownLink,
  Block as IPLDBlock,
  Phantom,
} from 'multiformats'
import { CarReader } from '@ipld/car'
import type { BlockIndex } from '@ipld/car/indexer'

export type { MultihashDigest, UnknownLink, CarReader, IPLDBlock, ByteView }

// Represents an entry in the index, supporting multiple index types
export type IndexRecordEntry =
  | { type: 'index/block@0.1'; data: BlockIndexRecord }
  | { type: 'index/sharded/dag@0.1'; data: ShardedDAGIndexRecord }

export type IndexRecord = BlockIndexRecord | ShardedDAGIndexRecord

// Index Store: Responsible for storing and retrieving indexed content
export interface IndexStore<IndexRecordEntry> {
  get(hash: MultihashDigest): Promise<IndexRecordEntry | null>
  set(hash: MultihashDigest, entry: IndexRecordEntry): Promise<void>
}

// Index: Defines how content is queried for retrieval
export interface Index<IndexEntry> {
  store: IndexStore<IndexEntry>

  /**
   * Indexes a given block iterable.
   *
   * @param {AsyncIterable<BlockIndex>} blockIterable - The block iterable reader.
   * @param {MultihashDigest} containerMultihash - The container multihash.
   * @param {object} [options]
   * @param {UnknownLink} [options.contextCid] - The context where this CID belongs to.
   * @returns {Promise<void>}
   */
  indexContainer(
    blockIterable: AsyncIterable<BlockIndex>,
    containerMultihash: MultihashDigest,
    options?: { contextCid?: UnknownLink }
  ): Promise<void>

  /**
   * Find the location of a given block by its multihash.
   *
   * @param {MultihashDigest} multihash - The hash of the block to find.
   * @param {object} [options]
   * @param {UnknownLink} [options.contextCid] - The context where this CID belongs to.
   * @returns {Promise<BlockLocation | null>}
   */
  findBlockLocation(
    multihash: MultihashDigest,
    options?: { contextCid?: UnknownLink }
  ): Promise<BlockLocation | null>

  /**
   * Find all containers that hold a given hash of content
   *
   * @param {MultihashDigest} multihash - The hash of the content to search for.
   * @returns {Promise<ContentLocation | null>}
   */
  findContainers(multihash: MultihashDigest): Promise<ContentLocation | null>
}

// Content Resolver: Resolves structured lookups for content locations
export interface ContentResolver {
  resolveContent(contentCID: UnknownLink): Promise<ContentLocation | null>
  resolveBlock(
    blockCID: UnknownLink,
    contentCID?: UnknownLink
  ): Promise<BlockLocation | null>
}

// Location details for a single block
export type BlockLocation = {
  container: MultihashDigest
  offset: number
  length: number
}

// Location details for content stored across multiple containers
export type ContentLocation = {
  contentCID: UnknownLink
  shards: MultihashDigest[]
}

export type BlockIndexRecord = {
  // hash digest of the block
  multihash: MultihashDigest
  // hash digest of the container containing the block
  container: MultihashDigest
  // Slice offset
  offset: number
  // Slice size in bytes
  length: number
}

export interface BlockIndexRecordView extends BlockIndexRecord {
  toIndexRecordEntry(): IndexRecordEntry
}

export type ShardDigest = MultihashDigest
export type SliceDigest = MultihashDigest
export type Position = [offset: number, length: number]

export interface ShardedDAGIndexRecord {
  /** DAG root CID that the index pertains to. */
  content: UnknownLink
  /** Index information for shards the DAG is split across. */
  shards: Map<ShardDigest, Map<SliceDigest, Position>>
}

export interface ShardedDAGIndexRecordView extends ShardedDAGIndexRecord {
  /** Set the offset/length information for the slice a shard. */
  setSlice(shard: ShardDigest, slice: SliceDigest, pos: Position): void
  toIndexRecordEntry(): IndexRecordEntry
}

/**
 * [Multicodec code] usually used to tag [multiformat].
 *
 * [multiformat]:https://multiformats.io/
 * [multicodec code]:https://github.com/multiformats/multicodec/blob/master/table.csv
 */
export type MulticodecCode<
  Code extends number = number,
  Name extends string = string
> = Code & Phantom<Name>
