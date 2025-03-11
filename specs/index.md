# Index

Indexing protocol allows content-addressable data to be served by the server with access to the stored verifiable containers. This is heavily inspired by the [w3-index specification](https://github.com/storacha/specs/blob/main/w3-index.md), but more specifically the [Sharded DAG Index](https://github.com/storacha/specs/blob/main/w3-index.md#sharded-dag-index).

## Index Schema

Index schema is variant type keyed by the format descriptor label designed to allow format evolution through versioning and additional schema variants.

```ts
type Index = Variant<{
  'index/sharded/dag@0.1': ShardedDAGIndex
}>
```

This version makes it fully compatible with the indexes used by Storacha.

### Sharded DAG Index

Sharded DAG index MUST describe complete set of blocks that make up the `content` in terms of `BlobSlice`s. A content CID representing the slices (verifiable containers) can be a UnixFS CID, a Blake3 hash CID, a PieceCID, or any other hash format.

#### Sharded DAG Index Schema

```ts

type ShardedDAGIndex = {
  // content identifier CID
  content: Link<any>
  // links to blob indexes that contain blocks of the content DAG
  shards: Link<BlobIndex>[]
}

type BlobIndex = [
  // hash digest of the blob
  digest: Multihash
  // Index of blob slices
  slices: BlobSlice
]

type BlobSlice = [
  // hash digest of the slice
  digest: Multihash
  // Slice offset
  offset: Int
  // Slice size in bytes
  length: Int
]

type Multihash = bytes
```

ℹ️ Please note that `shards` is a list of `BlobIndex` links. This provide a flexibility of bundling blob indexes or externalizing them by linking to them.

It is RECOMMENDED to include `BlobSlice` in `slices` that spans full range of the blob to make it available. On the flip side it creates a choice to share only partial index of the blob when so desired.

It is RECOMMENDED to bundle all the `BlobIndex`s inside the Content Archive of the `Index`.

#### Sharded DAG Index Example

> For the reader convenience we use `link` function to denote external blocks that should be linked

```js
{
  "index/sharded/dag@0.1": {
    "content": { "/": "bafy..dag" },
    "shards": [
      link([
        // blob multihash
        { "/": { "bytes": "blb...left" } },
        // sliced within the blob
        [
          [{ "/": { "bytes": "block..1"} }, 0, 128],
          [{ "/": { "bytes": "block..2"} }, 129, 256],
          [{ "/": { "bytes": "block..3"} }, 257, 384],
          [{ "/": { "bytes": "block..4"} }, 385, 512]
        ]
      ]),
      link([
        // blob multihash
        { "/": { "bytes": "blb...right" } },
        // sliced within the blob
        [
          [{ "/": { "bytes": "block..5"} }, 0, 128],
          [{ "/": { "bytes": "block..6"} }, 129, 256],
          [{ "/": { "bytes": "block..7"} }, 257, 384],
          [{ "/": { "bytes": "block..8"} }, 385, 512]
        ]
      ])
    ]
  }
}
```
