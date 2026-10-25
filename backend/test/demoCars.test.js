import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { demoCars } from '../src/seed/demoCars.js'

const assetDirectory = new URL('../../public/assets/cars/', import.meta.url)

test('demo cars reference valid local WebP assets', () => {
  for (const car of demoCars) {
    assert.equal(car.images.length > 0, true, `${car.slug} has no image`)
    for (const image of car.images) {
      assert.match(image, /^\/assets\/cars\/[\w-]+\.webp$/, `${car.slug} image is not a local WebP`)
      const asset = new URL(image.slice('/assets/cars/'.length), assetDirectory)
      assert.equal(existsSync(asset), true, `${car.slug} asset does not exist`)
      assert.equal(readFileSync(asset).toString('ascii', 8, 12), 'WEBP', `${car.slug} asset is invalid`)
    }
  }
})
