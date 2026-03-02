import { vi } from 'vitest'
import { Buffer } from 'buffer'
import * as fs from 'fs'
import * as path from 'path'

// Provide Buffer globally (required for kit file parsing)
global.Buffer = Buffer

// Mock Electron's window.api object
global.window = {
  api: {
    fs: {
      exists: vi.fn((filePath) => {
        try {
          return fs.existsSync(filePath)
        } catch (err) {
          return false
        }
      }),

      readFileBufferArray: vi.fn((filePath) => {
        try {
          const buffer = fs.readFileSync(filePath)
          return Array.from(buffer)
        } catch (err) {
          throw new Error(`Failed to read file: ${filePath}`)
        }
      }),

      writeFile: vi.fn((filePath, data) => {
        try {
          const buffer = Buffer.from(data)
          fs.writeFileSync(filePath, buffer)
          return true
        } catch (err) {
          throw new Error(`Failed to write file: ${filePath}`)
        }
      }),

      isDirectory: vi.fn((filePath) => {
        try {
          return fs.statSync(filePath).isDirectory()
        } catch (err) {
          return false
        }
      }),

      getFileListFromDirectory: vi.fn((dirPath) => {
        try {
          return fs.readdirSync(dirPath)
        } catch (err) {
          return []
        }
      }),

      getSampleFiles: vi.fn((dirPath) => {
        try {
          const files = fs.readdirSync(dirPath)
          return files.filter(f => f.toLowerCase().endsWith('.wav'))
        } catch (err) {
          return []
        }
      })
    },

    path: {
      parse: vi.fn((filePath) => path.parse(filePath)),
      join: vi.fn((...args) => path.join(...args))
    },

    store: {
      get: vi.fn(),
      save: vi.fn()
    }
  }
}

// Mock SampleStore to pass through file names without checking existence
// This allows both internal and external sample references to be preserved in tests
vi.mock('util/sampleStore', () => {
  return {
    default: {
      // Pass through file names as-is (external samples keep .wav)
      getFileNameFromKitFile: (fileName) => fileName || '',
      // When writing, strip .wav extension (kit files store 8-char names without extension)
      getWriteFileName: (fileName) => {
        if (!fileName) return ''
        // Remove .wav extension for writing to kit file
        return fileName.replace(/\.wav$/i, '')
      },
      deviceSamples: {},
      _getFlippedDeviceSamples: () => ({})
    }
  }
})
