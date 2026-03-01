import { describe, test, expect } from 'vitest'
import { DeviceType } from 'const'
import { getKitAndPadsFromFile as getKitAndPadsFromFilePro, getKitFileBuffer as getKitFileBufferPro } from 'util/kitFilePro'
import { getKitAndPadsFromFile as getKitAndPadsFromFileRack, getKitFileBuffer as getKitFileBufferRack } from 'util/kitFile'
import { jsonToBuffer, bufferToJson, modelsToJson } from '../utils/kitSerializer'
import { compareKits, createMockDrive, assertBufferEquals, assertPadEquals } from '../utils/testHelpers'
import * as fs from 'fs'
import * as path from 'path'

// Helper to convert pad array to object indexed by ID
function padArrayToObject(padArray) {
  const pads = {}
  padArray.forEach(pad => {
    pads[pad.id] = pad
  })
  return pads
}

describe('Round-trip Tests', () => {
  describe('SamplePad Pro', () => {
    const FIXTURES_PATH = path.join(process.cwd(), 'tests/fixtures/samplepad-pro')

    test('parse → serialize → parse yields identical result', () => {
      const mockDrive = createMockDrive(DeviceType.SAMPLEPAD_PRO, FIXTURES_PATH)

      // First parse
      const kitPath = path.join(FIXTURES_PATH, 'test-kit1.KIT')
      const result1 = getKitAndPadsFromFilePro(mockDrive, kitPath)

      try {
        // Serialize - pads is already an object indexed by ID
        const buffer = getKitFileBufferPro(mockDrive, result1.kit, result1.pads)

        // Write to temporary file
        const tmpFile = path.join(FIXTURES_PATH, 'roundtrip-temp.KIT')
        fs.writeFileSync(tmpFile, Buffer.from(buffer))

        // Second parse
        const result2 = getKitAndPadsFromFilePro(mockDrive, tmpFile)

        // Compare pads (convert objects to arrays in same order)
        const padsArray1 = result1.kit.pads.map(id => result1.pads[id])
        const padsArray2 = result2.kit.pads.map(id => result2.pads[id])

        expect(padsArray1.length).toBe(padsArray2.length)
        for (let i = 0; i < padsArray1.length; i++) {
          assertPadEquals(padsArray1[i], padsArray2[i])
        }
      } finally {
        // Clean up
        const tmpFile = path.join(FIXTURES_PATH, 'roundtrip-temp.KIT')
        if (fs.existsSync(tmpFile)) {
          fs.unlinkSync(tmpFile)
        }
      }
    })

    test('JSON → binary → JSON yields identical result', () => {
      const jsonPath = path.join(FIXTURES_PATH, 'test-kit1.json')
      const originalJson = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))

      // Convert to buffer
      const buffer = jsonToBuffer(originalJson, DeviceType.SAMPLEPAD_PRO)

      // Convert back to JSON
      const resultJson = bufferToJson(buffer, DeviceType.SAMPLEPAD_PRO, 'test-kit1.KIT')

      // Compare kit properties
      expect(resultJson.kit.deviceType).toBe(originalJson.kit.deviceType)
      // Kit name comes from filename, not from original JSON
      expect(resultJson.kit.kitName).toBe('test-kit1')
      expect(resultJson.pads.length).toBe(originalJson.pads.length)

      // Compare each pad
      resultJson.pads.forEach((pad, index) => {
        const originalPad = originalJson.pads[index]
        expect(pad.padType).toBe(originalPad.padType)
        expect(pad.location).toBe(originalPad.location)
        expect(pad.level).toBe(originalPad.level)
        expect(pad.tune).toBe(originalPad.tune)
        expect(pad.pan).toBe(originalPad.pan)
        expect(pad.reverb).toBe(originalPad.reverb)
        expect(pad.midiNote).toBe(originalPad.midiNote)
        expect(pad.mode).toBe(originalPad.mode)
        expect(pad.sensitivity).toBe(originalPad.sensitivity)
        expect(pad.mgrp).toBe(originalPad.mgrp)
        expect(pad.velocityMin).toBe(originalPad.velocityMin)
        expect(pad.velocityMax).toBe(originalPad.velocityMax)
        expect(pad.fileName).toBe(originalPad.fileName)
        expect(pad.velocityMinB).toBe(originalPad.velocityMinB)
        expect(pad.velocityMaxB).toBe(originalPad.velocityMaxB)
        expect(pad.fileNameB).toBe(originalPad.fileNameB)
      })
    })

    test('binary file → buffer → binary file is byte-identical', () => {
      const kitPath = path.join(FIXTURES_PATH, 'test-kit1.KIT')
      const originalBuffer = fs.readFileSync(kitPath)

      const mockDrive = createMockDrive(DeviceType.SAMPLEPAD_PRO, FIXTURES_PATH)

      // Parse
      const result = getKitAndPadsFromFilePro(mockDrive, kitPath)

      // Serialize - pads is already an object indexed by ID
      const newBuffer = Buffer.from(getKitFileBufferPro(mockDrive, result.kit, result.pads))

      // Compare buffers - ignore checksum byte since it will differ if any data changed
      assertBufferEquals(newBuffer, originalBuffer, { ignoreBytes: [0x08] })
    })

    test('empty kit round-trip', () => {
      const jsonPath = path.join(FIXTURES_PATH, 'empty-kit.json')
      const originalJson = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))

      const buffer = jsonToBuffer(originalJson, DeviceType.SAMPLEPAD_PRO)
      const resultJson = bufferToJson(buffer, DeviceType.SAMPLEPAD_PRO, 'empty.KIT')

      // Kit name comes from filename
      expect(resultJson.kit.kitName).toBe('empty')
      expect(resultJson.pads.length).toBe(17)
    })
  })

  describe('SampleRack', () => {
    const FIXTURES_PATH = path.join(process.cwd(), 'tests/fixtures/samplerack')

    test('parse → serialize → parse yields identical result', () => {
      const mockDrive = createMockDrive(DeviceType.SAMPLERACK, FIXTURES_PATH)

      // Use the committed test-kit1.KIT file
      const testKitPath = path.join(FIXTURES_PATH, 'test-kit1.KIT')

      // First parse
      const result1 = getKitAndPadsFromFileRack(mockDrive, testKitPath)

      try {
        // Serialize - pads is already an object indexed by ID
        const newBuffer = getKitFileBufferRack(mockDrive, result1.kit, result1.pads)

        // Write to temporary file
        const tmpFile = path.join(FIXTURES_PATH, 'roundtrip-temp.KIT')
        fs.writeFileSync(tmpFile, Buffer.from(newBuffer))

        // Second parse
        const result2 = getKitAndPadsFromFileRack(mockDrive, tmpFile)

        // Compare pads (convert objects to arrays in same order)
        const padsArray1 = result1.kit.pads.map(id => result1.pads[id])
        const padsArray2 = result2.kit.pads.map(id => result2.pads[id])

        expect(padsArray1.length).toBe(padsArray2.length)
        for (let i = 0; i < padsArray1.length; i++) {
          assertPadEquals(padsArray1[i], padsArray2[i])
        }
      } finally {
        // Clean up temp file
        const tmpFile = path.join(FIXTURES_PATH, 'roundtrip-temp.KIT')
        if (fs.existsSync(tmpFile)) {
          fs.unlinkSync(tmpFile)
        }
      }
    })

    test('JSON → binary → JSON yields identical result', () => {
      const jsonPath = path.join(FIXTURES_PATH, 'test-kit1.json')
      const originalJson = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))

      // Convert to buffer
      const buffer = jsonToBuffer(originalJson, DeviceType.SAMPLERACK)

      // Convert back to JSON
      const resultJson = bufferToJson(buffer, DeviceType.SAMPLERACK, 'test-kit1.KIT')

      // Compare kit properties
      expect(resultJson.kit.deviceType).toBe(originalJson.kit.deviceType)
      expect(resultJson.pads.length).toBe(originalJson.pads.length)

      // Compare each pad
      resultJson.pads.forEach((pad, index) => {
        const originalPad = originalJson.pads[index]
        expect(pad.padType).toBe(originalPad.padType)
        expect(pad.location).toBe(originalPad.location)
        expect(pad.level).toBe(originalPad.level)
        expect(pad.tune).toBe(originalPad.tune)
        expect(pad.pan).toBe(originalPad.pan)
        expect(pad.reverb).toBe(originalPad.reverb)
        expect(pad.midiNote).toBe(originalPad.midiNote)
        expect(pad.mode).toBe(originalPad.mode)
        expect(pad.sensitivity).toBe(originalPad.sensitivity)
        expect(pad.mgrp).toBe(originalPad.mgrp)
        expect(pad.velocityMin).toBe(originalPad.velocityMin)
        expect(pad.velocityMax).toBe(originalPad.velocityMax)
        expect(pad.fileName).toBe(originalPad.fileName)
      })
    })

    test('empty kit round-trip', () => {
      const jsonPath = path.join(FIXTURES_PATH, 'empty-kit.json')
      const originalJson = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))

      const buffer = jsonToBuffer(originalJson, DeviceType.SAMPLERACK)
      const resultJson = bufferToJson(buffer, DeviceType.SAMPLERACK, 'empty.KIT')

      expect(resultJson.pads.length).toBe(24)
    })
  })

  describe('Cross-Device Shared Behavior', () => {
    test('both devices use same checksum algorithm', () => {
      const proJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tests/fixtures/samplepad-pro/test-kit1.json'), 'utf8'))
      const rackJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tests/fixtures/samplerack/test-kit1.json'), 'utf8'))

      const proBuffer = jsonToBuffer(proJson, DeviceType.SAMPLEPAD_PRO)
      const rackBuffer = jsonToBuffer(rackJson, DeviceType.SAMPLERACK)

      // Both should have valid checksums at byte 0x08
      const proChecksum = proBuffer[0x08]
      const rackChecksum = rackBuffer[0x08]

      // Calculate checksums manually
      const proExpected = proBuffer.slice(0x09).reduce((sum, byte) => sum + byte, 0) % 256
      const rackExpected = rackBuffer.slice(0x09).reduce((sum, byte) => sum + byte, 0) % 256

      expect(proChecksum).toBe(proExpected)
      expect(rackChecksum).toBe(rackExpected)
    })

    test('both devices have same header signature', () => {
      const proJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tests/fixtures/samplepad-pro/test-kit1.json'), 'utf8'))
      const rackJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tests/fixtures/samplerack/test-kit1.json'), 'utf8'))

      const proBuffer = jsonToBuffer(proJson, DeviceType.SAMPLEPAD_PRO)
      const rackBuffer = jsonToBuffer(rackJson, DeviceType.SAMPLERACK)

      // Both should have "KITH" signature
      expect(proBuffer[0]).toBe(0x4b)
      expect(proBuffer[1]).toBe(0x49)
      expect(proBuffer[2]).toBe(0x54)
      expect(proBuffer[3]).toBe(0x48)

      expect(rackBuffer[0]).toBe(0x4b)
      expect(rackBuffer[1]).toBe(0x49)
      expect(rackBuffer[2]).toBe(0x54)
      expect(rackBuffer[3]).toBe(0x48)
    })
  })
})
