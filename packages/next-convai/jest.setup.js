require('@testing-library/jest-dom')

// Setup DOM for React Testing Library
const { TextEncoder, TextDecoder } = require('util')
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Setup additional globals for JSDOM
if (typeof document !== 'undefined') {
  Object.defineProperty(document, 'querySelector', {
    value: jest.fn().mockReturnValue(null),
    writable: true
  })
  
  Object.defineProperty(document, 'querySelectorAll', {
    value: jest.fn().mockReturnValue([]),
    writable: true
  })
  
  // Ensure document.body exists
  if (!document.body) {
    document.body = document.createElement('body')
  }
  
  // Ensure document.head exists
  if (!document.head) {
    document.head = document.createElement('head')
  }
}

// Mock fs-extra
jest.mock('fs-extra', () => ({
  pathExists: jest.fn().mockResolvedValue(true),
  readFile: jest.fn().mockResolvedValue(''),
  writeJson: jest.fn().mockResolvedValue(undefined),
  ensureDir: jest.fn().mockResolvedValue(undefined),
  readJson: jest.fn().mockResolvedValue({}),
  remove: jest.fn().mockResolvedValue(undefined)
}))

// Mock glob
jest.mock('glob', () => ({
  glob: jest.fn().mockResolvedValue([])
}))

// Mock child_process
jest.mock('child_process', () => ({
  exec: jest.fn().mockImplementation((command, options, callback) => {
    if (typeof options === 'function') {
      callback = options
    }
    if (callback) {
      callback(null, 'mock stdout', 'mock stderr')
    }
    return { pid: 123 }
  })
}))

// Mock cheerio
jest.mock('cheerio', () => ({
  load: jest.fn().mockReturnValue(jest.fn().mockReturnValue({
    text: jest.fn().mockReturnValue(''),
    attr: jest.fn().mockReturnValue('')
  }))
}))

// Mock Next.js router
global.window = {
  location: { pathname: '/' },
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  document: { title: 'Test App' },
  next: {
    router: {
      push: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn()
      }
    }
  }
}