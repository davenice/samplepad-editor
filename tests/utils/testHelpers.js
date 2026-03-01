import { expect } from 'vitest'

/**
 * Assert that two kit objects are equal
 * @param {Object} actual - Actual kit object
 * @param {Object} expected - Expected kit object
 */
export function assertKitEquals(actual, expected) {
  expect(actual.kitName).toBe(expected.kitName)
  expect(actual.fileName).toBe(expected.fileName)
  expect(actual.isLoaded).toBe(expected.isLoaded)
  expect(actual.pads.length).toBe(expected.pads.length)
}

/**
 * Assert that two pad objects are equal
 * @param {Object} actual - Actual pad object
 * @param {Object} expected - Expected pad object
 */
export function assertPadEquals(actual, expected) {
  expect(actual.padType).toBe(expected.padType)
  expect(actual.location).toBe(expected.location)
  expect(actual.level).toBe(expected.level)
  expect(actual.tune).toBe(expected.tune)
  expect(actual.pan).toBe(expected.pan)
  expect(actual.reverb).toBe(expected.reverb)
  expect(actual.midiNote).toBe(expected.midiNote)
  expect(actual.mode).toBe(expected.mode)
  expect(actual.sensitivity).toBe(expected.sensitivity)
  expect(actual.mgrp).toBe(expected.mgrp)
  expect(actual.velocityMin).toBe(expected.velocityMin)
  expect(actual.velocityMax).toBe(expected.velocityMax)
  expect(actual.fileName).toBe(expected.fileName)
  expect(actual.velocityMinB).toBe(expected.velocityMinB)
  expect(actual.velocityMaxB).toBe(expected.velocityMaxB)
  expect(actual.fileNameB).toBe(expected.fileNameB)
}

/**
 * Assert that two buffers are equal
 * @param {Buffer} actual - Actual buffer
 * @param {Buffer} expected - Expected buffer
 * @param {Object} options - Options for comparison
 * @param {Array<number>} options.ignoreBytes - Byte offsets to ignore in comparison
 */
export function assertBufferEquals(actual, expected, options = {}) {
  const { ignoreBytes = [] } = options

  expect(actual.length).toBe(expected.length)

  for (let i = 0; i < actual.length; i++) {
    if (ignoreBytes.includes(i)) {
      continue
    }

    if (actual[i] !== expected[i]) {
      throw new Error(
        `Buffer mismatch at byte ${i} (0x${i.toString(16)}): ` +
        `expected 0x${expected[i].toString(16).padStart(2, '0')}, ` +
        `got 0x${actual[i].toString(16).padStart(2, '0')}`
      )
    }
  }
}

/**
 * Deep compare two kits including all pads
 * @param {Object} kit1 - First kit
 * @param {Array<Object>} pads1 - First kit's pads
 * @param {Object} kit2 - Second kit
 * @param {Array<Object>} pads2 - Second kit's pads
 */
export function compareKits(kit1, pads1, kit2, pads2) {
  assertKitEquals(kit1, kit2)

  expect(pads1.length).toBe(pads2.length)

  for (let i = 0; i < pads1.length; i++) {
    assertPadEquals(pads1[i], pads2[i])
  }
}

/**
 * Create a mock drive object for testing
 * @param {string} deviceType - DeviceType constant
 * @param {string} path - Drive path
 * @returns {Object} Mock drive object
 */
export function createMockDrive(deviceType, path = '/mock/drive') {
  return {
    path: path,
    deviceType: deviceType
  }
}
