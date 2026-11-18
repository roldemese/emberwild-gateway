/**
 * Sizes the portal is built around.
 * The CI run uses the small numbers. A real holding uses the recommended numbers.
 * No bucket is opened from this repo.
 *
 * S3 figures are the public Amazon S3 service limits:
 * https://docs.aws.amazon.com/AmazonS3/latest/userguide/qfacts.html
 * Confirm them before any real bucket. This file does not contact S3.
 */

export const CI_CHUNK_BYTES = 64 * 1024
export const RECOMMENDED_CHUNK_BYTES = 64 * 1024 * 1024
export const S3_MIN_PART_BYTES = 5 * 1024 * 1024
export const S3_MAX_PART_BYTES = 5 * 1024 * 1024 * 1024
export const S3_MAX_PARTS = 10_000
export const S3_MAX_OBJECT_BYTES = 5 * 1024 * 1024 * 1024 * 1024
export const DEFAULT_PARALLEL = 4
export const DEFAULT_DATA_SHARDS = 4
export const DEFAULT_PARITY_SHARDS = 2
export const DEFAULT_COPIES = 2

export function holdingObjectCount(bytes, chunkBytes = RECOMMENDED_CHUNK_BYTES) {
  if (!Number.isInteger(bytes) || bytes < 0) throw new Error('A holding size is a non-negative integer.')
  if (!Number.isInteger(chunkBytes) || chunkBytes < 1) throw new Error('A chunk size is a positive integer.')
  return Math.ceil(bytes / chunkBytes)
}

/** One S3 object stops at 5 TiB. A larger holding is many objects, one per chunk. */
export function fitsOneS3Object(bytes) {
  return bytes <= S3_MAX_OBJECT_BYTES
}
