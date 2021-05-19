/* eslint-env mocha */

// this test is not intended to run in the browser

import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { promisify } from 'util'
import { CID } from 'multiformats/cid'
import { CarReader } from '@ipld/car/reader'
import { CarWriter } from '@ipld/car/writer'
import {
  verifyRoots,
  verifyHas,
  verifyGet,
  verifyBlocks,
  verifyCids
} from './verify-store-reader.js'
import { assert } from './common.js'

const fsopen = promisify(fs.open)
const fsclose = promisify(fs.close)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const goCarPath = path.join(__dirname, 'go.car')
const tmpCarPath = path.join(__dirname, 'tmp.car')

const newRoots = [
  CID.parse('bafkreidbxzk2ryxwwtqxem4l3xyyjvw35yu4tcct4cqeqxwo47zhxgxqwq'),
  CID.parse('bafkreiebzrnroamgos2adnbpgw5apo3z4iishhbdx77gldnbk57d4zdio4')
]

async function verify () {
  const reader = await CarReader.fromIterable(fs.createReadStream(tmpCarPath))
  await assert.isRejected(verifyRoots(reader)) // whoa, different roots? like magic
  assert.deepEqual(await reader.getRoots(), newRoots)
  await verifyHas(reader)
  await verifyGet(reader)
  await verifyBlocks(reader.blocks(), true)
  await verifyCids(reader.cids(), true)
}

describe('Node CarWriter.updateHeader()', () => {
  before(async () => {
    try {
      await fs.promises.unlink(tmpCarPath)
    } catch (e) {}
  })

  beforeEach(async () => {
    await fs.promises.copyFile(goCarPath, tmpCarPath)
  })

  afterEach(async () => {
    await fs.promises.unlink(tmpCarPath)
  })

  it('update header (fd)', async () => {
    const fd = await fsopen(tmpCarPath, 'r+')
    await CarWriter.updateRoots(fd, newRoots)
    await fsclose(fd)
    await verify()
  })

  it('update header (FileHandle)', async () => {
    const fd = await fs.promises.open(tmpCarPath, 'r+')
    await CarWriter.updateRoots(fd, newRoots)
    await fd.close()
    await verify()
  })

  it('error: bad fd', async () => {
    // @ts-ignore
    await assert.isRejected(CarWriter.updateRoots(true, newRoots), {
      name: 'TypeError',
      message: 'Bad fd'
    })
  })

  it('error: wrong header size', async () => {
    const fd = await fs.promises.open(tmpCarPath, 'r+')
    await assert.isRejected(CarWriter.updateRoots(fd, [...newRoots, newRoots[0]]), /can only overwrite a header of the same length/)
    await assert.isRejected(CarWriter.updateRoots(fd, [newRoots[0]]), /can only overwrite a header of the same length/)
    await assert.isRejected(CarWriter.updateRoots(fd, []), /can only overwrite a header of the same length/)
    await fd.close()
  })
})
