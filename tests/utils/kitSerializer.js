import { DeviceType } from 'const'
import { KitModel, PadModel } from 'state/models'
import { getKitAndPadsFromFile as getKitAndPadsFromFilePro } from 'util/kitFilePro'
import { getKitAndPadsFromFile as getKitAndPadsFromFileRack } from 'util/kitFile'
import { getKitFileBuffer as getKitFileBufferPro } from 'util/kitFilePro'
import { getKitFileBuffer as getKitFileBufferRack } from 'util/kitFile'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Convert JSON test data to PadModel objects
 * @param {Object} jsonData - JSON representation of kit data
 * @returns {Array<PadModel>} Array of PadModel objects
 */
export function jsonToPadModels(jsonData) {
  return jsonData.pads.map(pad => {
    return PadModel.getPad(
      pad.padType,
      pad.location,
      pad.level,
      pad.tune,
      pad.pan,
      pad.reverb,
      pad.midiNote,
      pad.mode,
      pad.sensitivity,
      pad.mgrp,
      pad.velocityMin,
      pad.velocityMax,
      pad.fileName || '',
      pad.velocityMinB,
      pad.velocityMaxB,
      pad.fileNameB || ''
    )
  })
}

/**
 * Convert JSON test data to KitModel object
 * @param {Object} jsonData - JSON representation of kit data
 * @returns {Object} KitModel object
 */
export function jsonToKitModel(jsonData) {
  const pads = jsonToPadModels(jsonData)
  const padIds = pads.map(p => p.id)

  return KitModel(
    '', // filePath
    jsonData.kit.fileName,
    false, // isNew
    false, // isExisting
    true, // isLoaded
    jsonData.kit.kitName,
    padIds
  )
}

/**
 * Convert PadModel and KitModel back to JSON format
 * @param {Object} kit - KitModel object
 * @param {Array<Object>|Object} pads - Array of PadModel objects or object indexed by ID
 * @param {string} deviceType - DeviceType constant
 * @returns {Object} JSON representation
 */
export function modelsToJson(kit, pads, deviceType) {
  // Convert pads to array if it's an object
  const padArray = Array.isArray(pads) ? pads : Object.values(pads)

  return {
    kit: {
      deviceType: deviceType,
      kitName: kit.kitName,
      fileName: kit.fileName
    },
    pads: padArray.map(pad => ({
      padType: pad.padType,
      location: pad.location,
      level: pad.level,
      tune: pad.tune,
      pan: pad.pan,
      reverb: pad.reverb,
      midiNote: pad.midiNote,
      mode: pad.mode,
      sensitivity: pad.sensitivity,
      mgrp: pad.mgrp,
      velocityMin: pad.velocityMin,
      velocityMax: pad.velocityMax,
      fileName: pad.fileName,
      velocityMinB: pad.velocityMinB,
      velocityMaxB: pad.velocityMaxB,
      fileNameB: pad.fileNameB
    }))
  }
}

/**
 * Convert JSON test data to binary buffer
 * @param {Object} jsonData - JSON representation of kit data
 * @param {string} deviceType - DeviceType constant
 * @returns {Buffer} Binary buffer
 */
export function jsonToBuffer(jsonData, deviceType) {
  // Create pad models once
  const padArray = jsonToPadModels(jsonData)

  // Create kit with pad IDs from the pad models we just created
  const padIds = padArray.map(p => p.id)
  const kit = KitModel(
    '', // filePath
    jsonData.kit.fileName,
    false, // isNew
    false, // isExisting
    true, // isLoaded
    jsonData.kit.kitName,
    padIds
  )

  // Convert pad array to object indexed by pad ID
  const pads = {}
  padArray.forEach(pad => {
    pads[pad.id] = pad
  })

  // Create mock drive object
  const mockDrive = {
    path: '',
    deviceType: deviceType
  }

  // Use appropriate serializer based on device type
  let bufferArray
  if (deviceType === DeviceType.SAMPLEPAD_PRO) {
    bufferArray = getKitFileBufferPro(mockDrive, kit, pads)
  } else {
    bufferArray = getKitFileBufferRack(mockDrive, kit, pads)
  }

  return Buffer.from(bufferArray)
}

/**
 * Convert binary buffer to JSON test data
 * @param {Buffer} buffer - Binary buffer
 * @param {string} deviceType - DeviceType constant
 * @param {string} kitFileName - Name of the kit file
 * @returns {Object} JSON representation
 */
export function bufferToJson(buffer, deviceType, kitFileName = 'test.KIT') {
  // Write buffer to temporary file for parsing
  const tmpDir = fs.mkdtempSync(path.join(process.cwd(), 'tmp-'))
  const tmpFile = path.join(tmpDir, kitFileName)

  try {
    fs.writeFileSync(tmpFile, buffer)

    // Create mock drive object
    const mockDrive = {
      path: tmpDir,
      deviceType: deviceType
    }

    // Parse using appropriate parser (pass full path)
    let result
    if (deviceType === DeviceType.SAMPLEPAD_PRO) {
      result = getKitAndPadsFromFilePro(mockDrive, tmpFile)
    } else {
      result = getKitAndPadsFromFileRack(mockDrive, tmpFile)
    }

    // Convert to JSON format
    return modelsToJson(result.kit, result.pads, deviceType)
  } finally {
    // Clean up temporary file
    try {
      fs.unlinkSync(tmpFile)
      fs.rmdirSync(tmpDir)
    } catch (err) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Write JSON test data to a .KIT file
 * @param {string} jsonPath - Path to JSON file
 * @param {string} outputKitPath - Path to output .KIT file
 */
export function jsonToKitFile(jsonPath, outputKitPath) {
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
  const buffer = jsonToBuffer(jsonData, jsonData.kit.deviceType)
  fs.writeFileSync(outputKitPath, buffer)
}

/**
 * Read a .KIT file and convert to JSON
 * @param {string} kitPath - Path to .KIT file
 * @param {string} outputJsonPath - Path to output JSON file
 * @param {string} deviceType - DeviceType constant
 */
export function kitFileToJson(kitPath, outputJsonPath, deviceType) {
  const buffer = fs.readFileSync(kitPath)
  const kitFileName = path.basename(kitPath)
  const jsonData = bufferToJson(buffer, deviceType, kitFileName)
  fs.writeFileSync(outputJsonPath, JSON.stringify(jsonData, null, 2))
}
