# @hash-stream/verifiable-container

> The verifiable-container client to use hash-stream

## Install

```sh
npm install @hash-stream/verifiable-container
```

## Usage

### Creating and Storing Verifiable Containers

You can create and store verifiable CAR containers using the createAndStore function. This function processes a BlobLike input, generates CAR containers, and stores them using a ContainerStore implementation.

```js
import { createAndStore } from 'verifiable-container'
import { FsStore } from 'verifiable-container/store/fs' // Example file system store

const store = new FsStore('/path/to/store') // Initialize the store

async function main() {
  const blob = new Blob(['Hello, world!']) // Example BlobLike object

  const { rootCid, containersMultihash } = await createAndStore(blob, store, {
    type: 'car',
  })

  console.log('Root CID:', rootCid)
  console.log('Stored containers:', containersMultihash)
}

main().catch(console.error)
```

### Creating Containers Without Storing

If you only need to generate CAR containers without storing them, use the create function. It returns an async generator (stream) that yields verifiable CAR containers and a promise (root) that resolves with the root CID.

```js
import { create } from 'verifiable-container'

async function main() {
  const blob = new Blob(['Hello, world!'])

  const { stream, root } = create(blob, { type: 'car' })

  const containers = []
  for await (const container of stream) {
    containers.push(container)
    console.log('Generated CAR multihash:', container.multihash)
  }

  console.log('Root CID:', await root)
}

main().catch(console.error)
```

### Using a Custom Store

The store parameter in createAndStore must implement the ContainerStore interface. A store must define the following methods:

```ts
interface ContainerStore {
  put(hash: MultihashDigest, data: Uint8Array): Promise<void>
  get(hash: MultihashDigest): Promise<Uint8Array | null>
}
```

#### Example: Implementing a Custom Store

```js
class MemoryStore {
  constructor() {
    this.storage = new Map()
  }

  async put(hash, data) {
    this.storage.set(hash.toString(), data)
  }

  async get(hash) {
    return this.storage.get(hash.toString()) || null
  }
}

const store = new MemoryStore()
```

## Contributing

Feel free to join in. All welcome. Please [open an issue](https://github.com/vasco-santos/hash-stream/issues)!

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/vasco-santos/hash-stream/blob/main/license.md)
