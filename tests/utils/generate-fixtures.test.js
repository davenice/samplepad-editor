import { describe, test } from 'vitest'
import { DeviceType } from 'const'
import { jsonToBuffer, kitFileToJson } from './kitSerializer'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Helper test to generate/convert test fixtures
 * Run with: npm test -- tests/utils/generate-fixtures.test.js
 */
describe.skip('Fixture Generation', () => {
  test('generate SamplePad Pro test-kit1.KIT', () => {
    const fixturesPath = path.join(process.cwd(), 'tests/fixtures/samplepad-pro')
    const jsonPath = path.join(fixturesPath, 'test-kit1.json')
    const kitPath = path.join(fixturesPath, 'test-kit1.KIT')

    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
    const buffer = jsonToBuffer(jsonData, DeviceType.SAMPLEPAD_PRO)
    fs.writeFileSync(kitPath, buffer)

    console.log(`✓ Generated: ${kitPath} (${buffer.length} bytes)`)
  })

  test('generate SampleRack test-kit1.KIT', () => {
    const fixturesPath = path.join(process.cwd(), 'tests/fixtures/samplerack')
    const jsonPath = path.join(fixturesPath, 'test-kit1.json')
    const kitPath = path.join(fixturesPath, 'test-kit1.KIT')

    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
    const buffer = jsonToBuffer(jsonData, DeviceType.SAMPLERACK)
    fs.writeFileSync(kitPath, buffer)

    console.log(`✓ Generated: ${kitPath}`)
  })

  test('generate SampleRack empty.KIT', () => {
    const fixturesPath = path.join(process.cwd(), 'tests/fixtures/samplerack')
    const jsonPath = path.join(fixturesPath, 'empty-kit.json')
    const kitPath = path.join(fixturesPath, 'empty.KIT')

    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
    const buffer = jsonToBuffer(jsonData, DeviceType.SAMPLERACK)
    fs.writeFileSync(kitPath, buffer)

    console.log(`✓ Generated: ${kitPath}`)
  })

  test('generate SamplePad Pro empty.KIT', () => {
    const fixturesPath = path.join(process.cwd(), 'tests/fixtures/samplepad-pro')
    const jsonPath = path.join(fixturesPath, 'empty-kit.json')
    const kitPath = path.join(fixturesPath, 'empty.KIT')

    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
    const buffer = jsonToBuffer(jsonData, DeviceType.SAMPLEPAD_PRO)
    fs.writeFileSync(kitPath, buffer)

    console.log(`✓ Generated: ${kitPath}`)
  })
})

describe.skip('Convert .KIT to JSON', () => {
  test('convert SamplePad Pro .KIT to JSON', () => {
    const kitPath = '/path/to/your/file.KIT'  // Change this path
    const outputPath = '/path/to/output.json'  // Change this path

    kitFileToJson(kitPath, outputPath, DeviceType.SAMPLEPAD_PRO)
    console.log(`✓ Converted: ${outputPath}`)
  })

  test('convert SampleRack .KIT to JSON', () => {
    const kitPath = '/path/to/your/file.KIT'  // Change this path
    const outputPath = '/path/to/output.json'  // Change this path

    kitFileToJson(kitPath, outputPath, DeviceType.SAMPLERACK)
    console.log(`✓ Converted: ${outputPath}`)
  })
})
