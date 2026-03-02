import { describe, test, expect, beforeEach, beforeAll } from 'vitest'
import { DeviceType } from 'const'
import { getKitAndPadsFromFile, getKitFileBuffer } from 'util/kitFilePro'
import { jsonToPadModels, jsonToKitModel, jsonToBuffer, bufferToJson } from '../utils/kitSerializer'
import { assertKitEquals, assertPadEquals, createMockDrive } from '../utils/testHelpers'
import * as fs from 'fs'
import * as path from 'path'

const FIXTURES_PATH = path.join(process.cwd(), 'tests/fixtures/samplepad-pro')

// Helper to convert pad array to object indexed by ID
function padArrayToObject(padArray) {
  const pads = {}
  padArray.forEach(pad => {
    pads[pad.id] = pad
  })
  return pads
}

describe('SamplePad Pro Parser', () => {
  let mockDrive

  beforeAll(() => {
    // Generate empty.KIT from JSON if it doesn't exist
    const emptyKitPath = path.join(FIXTURES_PATH, 'empty.KIT')
    if (!fs.existsSync(emptyKitPath)) {
      const emptyJson = JSON.parse(fs.readFileSync(path.join(FIXTURES_PATH, 'empty-kit.json'), 'utf8'))
      const buffer = jsonToBuffer(emptyJson, DeviceType.SAMPLEPAD_PRO)
      fs.writeFileSync(emptyKitPath, buffer)
    }
  })

  beforeEach(() => {
    mockDrive = createMockDrive(DeviceType.SAMPLEPAD_PRO, FIXTURES_PATH)
  })

  describe('getKitAndPadsFromFile', () => {
    test('parses valid kit file correctly', () => {
      const kitPath = path.join(FIXTURES_PATH, 'test-kit1.KIT')
      const result = getKitAndPadsFromFile(mockDrive, kitPath)

      expect(result).toBeDefined()
      expect(result.kit).toBeDefined()
      expect(result.pads).toBeDefined()
      // Kit name is derived from filename, not header
      expect(result.kit.kitName).toBe('test-kit1')
      expect(result.kit.fileName).toBe('test-kit1.KIT')
      expect(Object.keys(result.pads).length).toBe(17)
    })

    test('extracts kit name from filename', () => {
      const kitPath = path.join(FIXTURES_PATH, 'test-kit1.KIT')
      const result = getKitAndPadsFromFile(mockDrive, kitPath)

      // Current implementation uses filename, not header
      expect(result.kit.kitName).toBe('test-kit1')
    })

    test('converts sensitivity using formula (internal = display * 2 + 12)', () => {
      const kitPath = path.join(FIXTURES_PATH, 'test-kit1.KIT')
      const result = getKitAndPadsFromFile(mockDrive, kitPath)

      // Convert pads object to array for testing
      const padsArray = Object.values(result.pads)

      // Test pad_01 has sensitivity 5
      const pad01 = padsArray.find(p => p.padType === 'pad_01')
      expect(pad01.sensitivity).toBe(5)

      // Test pad_08 has sensitivity 2
      const pad08 = padsArray.find(p => p.padType === 'pad_08')
      expect(pad08.sensitivity).toBe(2)

      // Test hh_chk has sensitivity 8
      const hhChk = padsArray.find(p => p.padType === 'hh_chk')
      expect(hhChk.sensitivity).toBe(8)
    })

    test('parses all 17 pads in correct order', () => {
      const kitPath = path.join(FIXTURES_PATH, 'test-kit1.KIT')
      const result = getKitAndPadsFromFile(mockDrive, kitPath)
      const expectedPadTypes = [
        'pad_01', 'pad_02', 'pad_03', 'pad_04', 'pad_05', 'pad_06', 'pad_07', 'pad_08',
        'ext_1a', 'ext_1b', 'ext_2', 'kick', 'hh_ope', 'hh_mid', 'hh_clo', 'hh_chk', 'hh_spl'
      ]

      // Convert pads object to array, sorted by kit.pads order
      const padsArray = result.kit.pads.map(padId => result.pads[padId])

      expect(padsArray.length).toBe(17)
      padsArray.forEach((pad, index) => {
        expect(pad.padType).toBe(expectedPadTypes[index])
      })
    })

    test('handles sample file names (layer A and B)', () => {
      const kitPath = path.join(FIXTURES_PATH, 'test-kit1.KIT')
      const result = getKitAndPadsFromFile(mockDrive, kitPath)

      // Convert pads object to array for testing
      const padsArray = Object.values(result.pads)

      // Test pad with layer A filename (external sample)
      const pad01 = padsArray.find(p => p.padType === 'pad_01')
      expect(pad01.fileName).toBe('SHAKER2.wav')
      expect(pad01.fileNameB).toBe('')

      // Test pad with internal sample (no .wav extension, no number prefix)
      const pad08 = padsArray.find(p => p.padType === 'pad_08')
      expect(pad08.fileName).toBe('14AcHHCl')
    })

    test('parses empty kit correctly', () => {
      const kitPath = path.join(FIXTURES_PATH, 'empty.KIT')
      const result = getKitAndPadsFromFile(mockDrive, kitPath)

      // Convert pads object to array for testing
      const padsArray = Object.values(result.pads)

      // Kit name is derived from filename
      expect(result.kit.kitName).toBe('empty')
      expect(padsArray.length).toBe(17)

      // All pads should have default values
      padsArray.forEach(pad => {
        expect(pad.fileName).toBe('')
        expect(pad.fileNameB).toBe('')
      })
    })
  })

  describe('getKitFileBuffer', () => {
    test('generates valid binary buffer', () => {
      // Load JSON test data and convert to buffer
      const jsonData = JSON.parse(fs.readFileSync(path.join(FIXTURES_PATH, 'test-kit1.json'), 'utf8'))
      const buffer = jsonToBuffer(jsonData, DeviceType.SAMPLEPAD_PRO)

      expect(buffer).toBeDefined()
      expect(buffer.length).toBe(8832) // SamplePad Pro file size
    })

    test('writes kit name to header', () => {
      const jsonData = JSON.parse(fs.readFileSync(path.join(FIXTURES_PATH, 'test-kit1.json'), 'utf8'))
      const buffer = jsonToBuffer(jsonData, DeviceType.SAMPLEPAD_PRO)

      // Kit name starts at offset 0x48 (72)
      // Length byte is at 0x47 (71)
      const kitNameLength = buffer[0x47]
      const kitNameBytes = buffer.slice(0x48, 0x48 + kitNameLength)
      const kitName = String.fromCharCode(...kitNameBytes)

      expect(kitName).toBe('test-kit1')
    })

    test('calculates correct checksum', () => {
      const jsonData = JSON.parse(fs.readFileSync(path.join(FIXTURES_PATH, 'test-kit1.json'), 'utf8'))
      const buffer = jsonToBuffer(jsonData, DeviceType.SAMPLEPAD_PRO)

      // Checksum is at byte 0x08
      const checksum = buffer[0x08]

      // Calculate expected checksum (sum of all bytes after 0x08, mod 256)
      const expectedChecksum = buffer.slice(0x09).reduce((sum, byte) => sum + byte, 0) % 256

      expect(checksum).toBe(expectedChecksum)
    })

    test('writes sensitivity using formula (internal = display * 2 + 12)', () => {
      const jsonData = JSON.parse(fs.readFileSync(path.join(FIXTURES_PATH, 'test-kit1.json'), 'utf8'))

      // Verify test data has sensitivity 5 for pad_01
      const pad01Data = jsonData.pads.find(p => p.padType === 'pad_01')
      expect(pad01Data.sensitivity).toBe(5)

      const buffer = jsonToBuffer(jsonData, DeviceType.SAMPLEPAD_PRO)

      // Read sensitivity from buffer
      // Pad 01 is at block offset 0x0080, sensitivity offset is 0x41
      const sensitivityInternal = buffer[0x0080 + 0x41]

      // Expected: 5 * 2 + 12 = 22 = 0x16
      expect(sensitivityInternal).toBe(22)
    })
  })

  describe('JSON to buffer conversion', () => {
    test('converts JSON to buffer correctly', () => {
      const jsonData = JSON.parse(fs.readFileSync(path.join(FIXTURES_PATH, 'test-kit1.json'), 'utf8'))
      const buffer = jsonToBuffer(jsonData, DeviceType.SAMPLEPAD_PRO)

      expect(buffer.length).toBe(8832)

      // Verify header signature "KITH"
      expect(buffer[0]).toBe(0x4b)
      expect(buffer[1]).toBe(0x49)
      expect(buffer[2]).toBe(0x54)
      expect(buffer[3]).toBe(0x48)
    })

    test('converts buffer to JSON correctly', () => {
      const kitPath = path.join(FIXTURES_PATH, 'test-kit1.KIT')
      const originalBuffer = fs.readFileSync(kitPath)
      const jsonData = bufferToJson(originalBuffer, DeviceType.SAMPLEPAD_PRO, 'test-kit1.KIT')

      expect(jsonData.kit.deviceType).toBe(DeviceType.SAMPLEPAD_PRO)
      // Kit name is derived from filename, not header
      expect(jsonData.kit.kitName).toBe('test-kit1')
      expect(jsonData.pads.length).toBe(17)
    })
  })
})
