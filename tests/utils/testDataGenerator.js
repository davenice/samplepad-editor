import { DeviceType, KitBuffer, MidiMap } from 'const'

/**
 * Generate an empty kit with all default values
 * @param {string} deviceType - DeviceType constant
 * @returns {Object} JSON representation of an empty kit
 */
export function generateEmptyKit(deviceType) {
  const padOrder = KitBuffer.PAD_FILE_ORDER[deviceType]
  const midiMap = MidiMap[deviceType]

  const pads = padOrder.map(padType => {
    const [, defaultMidi] = midiMap[padType]

    return {
      padType: padType,
      location: 0, // internal
      level: 10,
      tune: 0,
      pan: 0, // center
      reverb: 0,
      midiNote: defaultMidi,
      mode: 1, // mono
      sensitivity: 1,
      mgrp: 0, // off
      velocityMin: 0,
      velocityMax: 127,
      fileName: '',
      velocityMinB: 0,
      velocityMaxB: 127,
      fileNameB: ''
    }
  })

  return {
    kit: {
      deviceType: deviceType,
      kitName: deviceType === DeviceType.SAMPLEPAD_PRO ? 'Empty Kit' : '',
      fileName: 'empty.KIT'
    },
    pads: pads
  }
}

/**
 * Generate a test kit with custom pad configurations
 * @param {string} deviceType - DeviceType constant
 * @param {Array<Object>} customPads - Array of custom pad configurations (optional)
 * @returns {Object} JSON representation of a test kit
 */
export function generateTestKit(deviceType, customPads = []) {
  const emptyKit = generateEmptyKit(deviceType)

  // If no custom pads provided, return empty kit
  if (customPads.length === 0) {
    return emptyKit
  }

  // Merge custom pads with empty kit
  const customPadMap = {}
  customPads.forEach(pad => {
    customPadMap[pad.padType] = pad
  })

  emptyKit.pads = emptyKit.pads.map(pad => {
    if (customPadMap[pad.padType]) {
      return { ...pad, ...customPadMap[pad.padType] }
    }
    return pad
  })

  return emptyKit
}

/**
 * Generate a kit with maximum parameter values (for edge case testing)
 * @param {string} deviceType - DeviceType constant
 * @returns {Object} JSON representation
 */
export function generateMaxValuesKit(deviceType) {
  const emptyKit = generateEmptyKit(deviceType)

  emptyKit.kit.kitName = deviceType === DeviceType.SAMPLEPAD_PRO ? '12345678901234567890123456789012345678901234567890123456' : ''
  emptyKit.pads = emptyKit.pads.map(pad => ({
    ...pad,
    location: 1, // card
    level: 10,
    tune: 4,
    pan: 4,
    reverb: 10,
    midiNote: 127,
    mode: 2,
    sensitivity: 8,
    mgrp: 4,
    velocityMin: 0,
    velocityMax: 127,
    fileName: 'MAXFILE.wav',
    velocityMinB: 0,
    velocityMaxB: 127,
    fileNameB: 'MAXFILEB.wav'
  }))

  return emptyKit
}

/**
 * Generate a kit with minimum parameter values (for edge case testing)
 * @param {string} deviceType - DeviceType constant
 * @returns {Object} JSON representation
 */
export function generateMinValuesKit(deviceType) {
  const emptyKit = generateEmptyKit(deviceType)

  emptyKit.kit.kitName = deviceType === DeviceType.SAMPLEPAD_PRO ? 'Min' : ''
  emptyKit.pads = emptyKit.pads.map(pad => ({
    ...pad,
    location: 0, // internal
    level: 0,
    tune: -4,
    pan: -4,
    reverb: 0,
    midiNote: 0,
    mode: 0,
    sensitivity: 1,
    mgrp: 0,
    velocityMin: 0,
    velocityMax: 127,
    fileName: '',
    velocityMinB: 0,
    velocityMaxB: 127,
    fileNameB: ''
  }))

  return emptyKit
}
