# Content Reader Specification

![wip](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square)

## Editors

- [Vasco Santos](https://github.com/vasco-santos)

## Authors

- [Vasco Santos](https://github.com/vasco-santos)

# Abstract

This document describes the Content Reader, responsible for retrieving verifiable packs and blocks efficiently.

## Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC2119](https://datatracker.ietf.org/doc/html/rfc2119).

# Overview

The Content Reader provides structured access to stored data using an indexing layer. It supports both:

- **Blob retrieval**: For individual blob lookups.
- **Stream retrieval**: For a set of blob/packs lookups based on a containing multihash.

Retrieval is enabled by the [Index Specification](./index.md), which maintains metadata about stored content.

## Design Principles

- **Trustless verification**: Ensures clients can verify retrieved content.
- **Efficient storage access**: Optimized for cost and speed.
- **Pluggable storage backends**: Supports different storage layers (e.g., filesystem, cloud storage).

## Interfaces

### Content Reader Interface

```ts
interface ContentReader {
  // Retrieve Blob bytes from its known location
  getBlob(location: LocationRecord): Uint8Array | null

  // Retrieve an entire package given its resolved locations
  getStream(locations: LocationRecord[]): AsyncIterable<Uint8Array>
}

type LocationRecord = {
  location: Multihash
  offset: Int
  length: Int
}
```

## Relationship Between Components

A Content Reader, Index, and Verifiable Content interface work together to provide structured and efficient access to stored data:

1. **Index Maintains Metadata**

   - The [Index](./index.md) maintains mappings of Multihashes to their storage locations.
   - When a client requests a blob or stream via `VerifiableContent`, the Index resolves the corresponding `BlobLocation`.

2. **Verifiable Content Fetches Data**

   - The `VerifiableContent` interface acts as the main entry point for clients requesting content.
   - It queries the Index to resolve locations, calls the Content Store for actual data retrieval and packs data into a container.

3. **Content Store Provides Raw Data**

   - Uses the resolved locations from the Index to fetch the required blobs.
   - Supports multiple storage backends for optimized access.

4. **Verifiable Retrieval**
   - Ensures data integrity by returning encoded content that clients can validate.
   - Blobs are retrieved as raw-encoded objects, and stream is packaged as CAR files.

```mermaid
graph TD;
    subgraph Client
        A[Client Request]
        G[Verify Retrieved Data]
    end

    subgraph Index
        B[Index Lookup]
    end

    subgraph VerifiableContent
        C[Resolve Content]
        D[Get Data from Store]
        H[Package Data for Verification]
    end

    subgraph ContentStore
        E[Fetch Block or Content]
        F[Storage Backend: Filesystem, Cloud, etc.]
    end

    A -->|Request Content| C
    C -->|Lookup Multihash| B
    B -->|Resolve to Location| D
    D -->|Request Data| E
    E -->|Retrieve from Storage| F
    E -->|Return Data| D
    D -->|Package Data| H
    H -->|Send Packaged Data| A
    A -->|Verify Content| G
```

## Storage Implementation Strategies

### Filesystem-based Store

- Blocks and containers stored as files.
- Uses indexing for quick lookups.

### Cloud Storage Backend

- Uses object storage (e.g., S3, GCS).
- Indexes maintained separately for efficient access.

## Future work

- implementation suggestions for storage, like which keys are good idea to use, etc

For indexing details, see the [Index Specification](./index.md).
