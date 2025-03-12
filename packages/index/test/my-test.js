// import { CarBlockIterator } from '@ipld/car/iterator'
// import { CarIndexer } from '@ipld/car/indexer'
// import { fromShardArchives } from '@web3-storage/blob-index/util'
// import { base58btc } from 'multiformats/bases/base58'
// import { CID } from 'multiformats/cid'

// import { BlockLevelIndex } from '../src/block-level-index.js'
// import { MemoryBlockIndexStore } from '../src/stores/memory-block.js'
// import { BlockIndexEntry } from '../src/entry/block.js'

// import { randomCAR, CarCode } from './helpers/random.js'

// // Store
// const memoryBlockStore = new MemoryBlockIndexStore()
// const blocktopLevelIndex = new BlockLevelIndex(memoryBlockStore)

// // TODO: generate content to split into multiple CARs

// // Generate CAR File
// const contentCAR = await randomCAR(4100, { chunkSize: 2000 })
// const rootCid = contentCAR.roots[0]
// const contentCarBytes = new Uint8Array(await contentCAR.arrayBuffer())

// if (!rootCid) throw new Error('No root CID found')

// console.log('content CID', rootCid.toString())
// console.log('shard CID', contentCAR.cid.toString())
// console.log(
//   'shard multihash',
//   base58btc.encode(contentCAR.cid.multihash.digest)
// )

// console.log('\n----------------------------------\n')

// // Create multi level index for CAR using sharded dag index
// const index = await fromShardArchives(rootCid, [contentCarBytes])

// console.log('index.content CID', index.content.toString())
// console.log('index.shards.size', index.shards.size)

// for (const [shardKey, shard] of index.shards.entries()) {
//   const c = CID.createV1(CarCode, shardKey)
//   console.log('shard cid', c.toString())

//   for (const [key, e] of shard.entries()) {
//     const encodedMultihash = base58btc.encode(key.digest)
//     console.log('block cid', encodedMultihash, 'range', e)

//     const blockIndex = new BlockIndexEntry(key, shardKey, e[0], e[1])
//     await memoryBlockStore.set(key, blockIndex)
//   }
// }

// console.log('\n----------------------------------\n')

// // Iterate through CAR blocks
// const carReader = await CarBlockIterator.fromBytes(contentCarBytes)
// for await (const block of carReader) {
//   const encodedMultihash = base58btc.encode(block.cid.multihash.digest)
//   console.log('block', encodedMultihash, 'size', block.bytes.byteLength)

//   const storeBlockGet = await memoryBlockStore.get(block.cid.multihash)
//   console.log(
//     'store get block container',
//     base58btc.encode(storeBlockGet?.container.digest),
//     storeBlockGet?.offset,
//     storeBlockGet?.length
//   )

//   const location = await blocktopLevelIndex.findBlockLocation(
//     block.cid.multihash
//   )
//   console.log(
//     'Index get block container location:',
//     base58btc.encode(location?.container.digest),
//     location?.offset,
//     location?.length
//   )
// }

// console.log('\n----------------------------------\n')

// // // Create CarV2 Index
// // const indexer = await CarIndexer.fromBytes(contentCarBytes)
// // const { readable, writable } = new TransformStream()
// // const writer = IndexSortedWriter.createWriter({ writer: writable.getWriter() })

// // /** @type {import('multiformats').CID[]} */
// // const cids = []

// // const closePromise = (async () => {
// //   for await (const { cid, offset } of indexer) {
// //     cids.push(cid)
// //     await writer.add(cid, offset)
// //   }
// //   await writer.close()
// // })()

// // const reader = IndexSortedReader.createReader({ reader: readable.getReader() })

// // while (true) {
// //   const { done, value } = await reader.read()
// //   if (done) break
// //   const { digest, offset } = value
// //   const i = cids.findIndex((cid) => equals(cid.multihash.digest, digest))
// //   console.log(`${cids[i]} @ ${offset}`)
// //   cids.splice(i, 1)
// // }

// // await closePromise
