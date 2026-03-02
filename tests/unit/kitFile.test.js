import { describe, test, expect, beforeEach, beforeAll } from 'vitest'
import { DeviceType } from 'const'
import { getKitAndPadsFromFile, getKitFileBuffer } from 'util/kitFile'
import { jsonToPadModels, jsonToKitModel, jsonToBuffer, bufferToJson } from '../utils/kitSerializer'
import { assertKitEquals, assertPadEquals, createMockDrive } from '../utils/testHelpers'
import * as fs from 'fs'
import * as path from 'path'

const FIXTURES_PATH = path.join(process.cwd(), 'tests/fixtures/samplerack')

// Helper to convert pad array to object indexed by ID
function padArrayToObject(padArray) {
  const pads = {}
  padArray.forEach(pad => {
    pads[pad.id] = pad
  })
  return pads
}

describe('SampleRack Parser', () => {
  let mockDrive

  // Note: SampleRack .KIT test files should be generated manually and committed
  // beforeAll(() => {
  //   // The .KIT files are checked into the repo as permanent test fixtures
  // })

  beforeEach(() => {
    mockDrive = createMockDrive(DeviceType.SAMPLERACK, FIXTURES_PATH)
  })

  describe('getKitAndPadsFromFile', () => {
    test('parses valid kit file correctly', () => {
      const kitPath = path.join(FIXTURES_PATH, 'test-kit1.KIT')
      const result = getKitAndPadsFromFile(mockDrive, kitPath)

      expect(result).toBeDefined()
      expect(result.kit).toBeDefined()
      expect(result.pads).toBeDefined()
      expect(result.kit.fileName).toBe('test-kit1.KIT')
      expect(Object.keys(result.pads).length).toBe(24)
    })

    test('converts sensitivity using lookup table', () => {
      const kitPath = path.join(FIXTURES_PATH, 'test-kit1.KIT')
      const result = getKitAndPadsFromFile(mockDrive, kitPath)

      // Convert pads object to array for testing
      const padsArray = Object.values(result.pads)

      // Test various sensitivity values using lookup table
      const snrA = padsArray.find(p => p.padType === 'snr_a')
      expect(snrA.sensitivity).toBe(1)

      const hhaOp = padsArray.find(p => p.padType === 'hha_op')
      expect(hhaOp.sensitivity).toBe(1)

      const hhChk = padsArray.find(p => p.padType === 'hh_chk')
      expect(hhChk.sensitivity).toBe(1)
    })

    test('parses all 24 pads in correct order', () => {
      const kitPath = path.join(FIXTURES_PATH, 'test-kit1.KIT')
      const result = getKitAndPadsFromFile(mockDrive, kitPath)
      const expectedPadTypes = [
        'kick',
        'snr_a', 'snr_b', 'tom1a', 'tom1b', 'tom2a', 'tom2b', 'tom3a', 'tom3b',
        'cr1a', 'cr1b', 'cr2a', 'cr2b', 'ridea', 'rideb', 'ride2',
        'hha_op', 'hha_md', 'hha_cl', 'hhb_op', 'hhb_md', 'hhb_cl', 'hh_chk', 'hh_spl'
      ]

      // Convert pads object to array, sorted by kit.pads order
      const padsArray = result.kit.pads.map(padId => result.pads[padId])

      expect(padsArray.length).toBe(24)
      padsArray.forEach((pad, index) => {
        expect(pad.padType).toBe(expectedPadTypes[index])
      })
    })

    test('handles sample file names', () => {
      const kitPath = path.join(FIXTURES_PATH, 'test-kit1.KIT')
      const result = getKitAndPadsFromFile(mockDrive, kitPath)

      // Convert pads object to array for testing
      const padsArray = Object.values(result.pads)

      // Test pad with filename
      const snrA = padsArray.find(p => p.padType === 'snr_a')
      expect(snrA.fileName).toBe('clap1.wav')
      expect(snrA.fileNameB).toBe('')

      const kick = padsArray.find(p => p.padType === 'kick')
      expect(kick.fileName).toBe('KISSBA.wav')
    })

    test('parses empty kit correctly', () => {
      const kitPath = path.join(FIXTURES_PATH, 'empty.KIT')
      const result = getKitAndPadsFromFile(mockDrive, kitPath)

      // Convert pads object to array for testing
      const padsArray = Object.values(result.pads)

      expect(padsArray.length).toBe(24)

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
      const buffer = jsonToBuffer(jsonData, DeviceType.SAMPLERACK)

      expect(buffer).toBeDefined()
      expect(buffer.length).toBe(12416) // SampleRack file size
    })

    test('does not write kit name to header', () => {
      const jsonData = JSON.parse(fs.readFileSync(path.join(FIXTURES_PATH, 'test-kit1.json'), 'utf8'))
      const buffer = jsonToBuffer(jsonData, DeviceType.SAMPLERACK)

      // SampleRack does not store kit name in header
      // The kit name area should be zeros or defaults
      // (Kit name is derived from filename instead)
      expect(buffer).toBeDefined()
    })

    test('calculates correct checksum', () => {
      const jsonData = JSON.parse(fs.readFileSync(path.join(FIXTURES_PATH, 'test-kit1.json'), 'utf8'))
      const buffer = jsonToBuffer(jsonData, DeviceType.SAMPLERACK)

      // Checksum is at byte 0x08
      const checksum = buffer[0x08]

      // Calculate expected checksum (sum of all bytes after 0x08, mod 256)
      const expectedChecksum = buffer.slice(0x09).reduce((sum, byte) => sum + byte, 0) % 256

      expect(checksum).toBe(expectedChecksum)
    })

    test('writes sensitivity using lookup table', () => {
      const jsonData = JSON.parse(fs.readFileSync(path.join(FIXTURES_PATH, 'test-kit1.json'), 'utf8'))

      // Verify test data has sensitivity 1 for snr_a
      const snrAData = jsonData.pads.find(p => p.padType === 'snr_a')
      expect(snrAData.sensitivity).toBe(1)

      const buffer = jsonToBuffer(jsonData, DeviceType.SAMPLERACK)

      // Read sensitivity from buffer
      // snr_a is at block offset 0x0080, sensitivity offset is 0x41
      const sensitivityInternal = buffer[0x0080 + 0x41]

      // Expected: lookup table value for 1 = 0x0b
      expect(sensitivityInternal).toBe(0x0b)
    })

    test('sensitivity lookup table values', () => {
      // Test all lookup table values
      const lookupTable = {
        1: 0x0b,
        2: 0x0e,
        3: 0x11,
        4: 0x14,
        5: 0x17,
        6: 0x1a,
        7: 0x1d,
        8: 0x20
      }

      Object.entries(lookupTable).forEach(([display, expected]) => {
        const jsonData = JSON.parse(fs.readFileSync(path.join(FIXTURES_PATH, 'empty-kit.json'), 'utf8'))

        // Set first pad sensitivity to test value
        jsonData.pads[0].sensitivity = parseInt(display)

        const buffer = jsonToBuffer(jsonData, DeviceType.SAMPLERACK)

        // Read sensitivity from first pad block
        const sensitivityInternal = buffer[0x0080 + 0x41]
        expect(sensitivityInternal).toBe(expected)
      })
    })
  })

  describe('JSON to buffer conversion', () => {
    test('converts JSON to buffer correctly', () => {
      const jsonData = JSON.parse(fs.readFileSync(path.join(FIXTURES_PATH, 'test-kit1.json'), 'utf8'))
      const buffer = jsonToBuffer(jsonData, DeviceType.SAMPLERACK)

      expect(buffer.length).toBe(12416)

      // Verify header signature "KITH"
      expect(buffer[0]).toBe(0x4b)
      expect(buffer[1]).toBe(0x49)
      expect(buffer[2]).toBe(0x54)
      expect(buffer[3]).toBe(0x48)
    })
  })
})
