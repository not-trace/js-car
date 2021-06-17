/* eslint-env mocha */

import { CarIndexer } from '@ipld/car/indexer'
import {
  goCarBytes,
  goCarIndex,
  goCarV2Bytes,
  goCarV2Roots,
  goCarV2Index,
  makeIterable,
  assert
} from './common.js'
import { verifyRoots } from './verify-store-reader.js'

describe('CarIndexer fromBytes()', () => {
  it('complete', async () => {
    const indexer = await CarIndexer.fromBytes(goCarBytes)
    await verifyRoots(indexer) // behaves like an Reader for roots
    assert.strictEqual(indexer.version, 1)

    const indexData = []
    for await (const index of indexer) {
      indexData.push(index)
    }

    assert.deepStrictEqual(indexData, goCarIndex)
  })

  it('v2 complete', async () => {
    const indexer = await CarIndexer.fromBytes(goCarV2Bytes)
    const roots = await indexer.getRoots()
    assert.strictEqual(roots.length, 1)
    assert(goCarV2Roots[0].equals(roots[0]))
    assert.strictEqual(indexer.version, 2)

    const indexData = []
    for await (const index of indexer) {
      indexData.push(index)
    }

    assert.deepStrictEqual(indexData, goCarV2Index)
  })

  it('bad argument', async () => {
    for (const arg of [true, false, null, undefined, 'string', 100, { obj: 'nope' }]) {
      // @ts-ignore
      await assert.isRejected(CarIndexer.fromBytes(arg))
    }
  })
})

describe('CarIndexer fromIterable()', () => {
  /** @param {CarIndexer} indexer */
  async function verifyIndexer (indexer) {
    await verifyRoots(indexer) // behaves like an Reader for roots
    assert.strictEqual(indexer.version, 1)

    const indexData = []
    for await (const index of indexer) {
      indexData.push(index)
    }

    assert.deepStrictEqual(indexData, goCarIndex)
  }

  it('complete (single chunk)', async () => {
    const indexer = await CarIndexer.fromIterable(makeIterable(goCarBytes, goCarBytes.length))
    return verifyIndexer(indexer)
  })

  it('complete (101-byte chunks)', async () => {
    const indexer = await CarIndexer.fromIterable(makeIterable(goCarBytes, 101))
    return verifyIndexer(indexer)
  })

  it('complete (32-byte chunks)', async () => {
    const indexer = await CarIndexer.fromIterable(makeIterable(goCarBytes, 32))
    return verifyIndexer(indexer)
  })

  it('bad argument', async () => {
    for (const arg of [new Uint8Array(0), true, false, null, undefined, 'string', 100, { obj: 'nope' }]) {
      // @ts-ignore
      await assert.isRejected(CarIndexer.fromIterable(arg))
    }
  })
})
