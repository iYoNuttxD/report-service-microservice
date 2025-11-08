const path = require('path')
const fs = require('fs')

describe('Architecture Tests', () => {
  describe('Layer Dependencies', () => {
    it('domain layer should not import from infra', () => {
      const domainPath = path.join(__dirname, '../../src/domain')
      const violations = []

      function checkFile (filePath) {
        const content = fs.readFileSync(filePath, 'utf8')
        if (content.includes('require(\'../infra') || content.includes('require("../infra')) {
          violations.push(filePath)
        }
        if (content.includes('require(\'../../infra') || content.includes('require("../../infra')) {
          violations.push(filePath)
        }
        if (content.includes('require(\'../../../infra') || content.includes('require("../../../infra')) {
          violations.push(filePath)
        }
      }

      function walkDir (dir) {
        const files = fs.readdirSync(dir)
        files.forEach((file) => {
          const filePath = path.join(dir, file)
          const stat = fs.statSync(filePath)
          if (stat.isDirectory()) {
            walkDir(filePath)
          } else if (file.endsWith('.js')) {
            checkFile(filePath)
          }
        })
      }

      if (fs.existsSync(domainPath)) {
        walkDir(domainPath)
      }

      expect(violations).toEqual([])
    })

    it('domain layer should not import framework libraries directly', () => {
      const domainPath = path.join(__dirname, '../../src/domain')
      const violations = []

      const frameworkLibs = ['express', 'mongodb', 'nats', 'axios']

      function checkFile (filePath) {
        const content = fs.readFileSync(filePath, 'utf8')
        frameworkLibs.forEach((lib) => {
          if (content.includes(`require('${lib}')`) || content.includes(`require("${lib}")`)) {
            violations.push({ file: filePath, lib })
          }
        })
      }

      function walkDir (dir) {
        const files = fs.readdirSync(dir)
        files.forEach((file) => {
          const filePath = path.join(dir, file)
          const stat = fs.statSync(filePath)
          if (stat.isDirectory()) {
            walkDir(filePath)
          } else if (file.endsWith('.js')) {
            checkFile(filePath)
          }
        })
      }

      if (fs.existsSync(domainPath)) {
        walkDir(domainPath)
      }

      expect(violations).toEqual([])
    })

    it('HTTP handlers should only depend on use cases and ports', () => {
      const handlersPath = path.join(__dirname, '../../src/features/reports/http/handlers')
      const violations = []

      function checkFile (filePath) {
        const content = fs.readFileSync(filePath, 'utf8')
        // Handlers should not directly require repositories or adapters
        if (content.includes('require(\'../../../../infra/repositories')) {
          violations.push({ file: filePath, reason: 'Direct repository import' })
        }
        if (content.includes('require(\'../../../../infra/adapters')) {
          violations.push({ file: filePath, reason: 'Direct adapter import' })
        }
      }

      function walkDir (dir) {
        if (!fs.existsSync(dir)) return
        const files = fs.readdirSync(dir)
        files.forEach((file) => {
          const filePath = path.join(dir, file)
          const stat = fs.statSync(filePath)
          if (stat.isDirectory()) {
            walkDir(filePath)
          } else if (file.endsWith('.js')) {
            checkFile(filePath)
          }
        })
      }

      walkDir(handlersPath)

      expect(violations).toEqual([])
    })
  })

  describe('File Structure', () => {
    it('should have all required directories', () => {
      const basePath = path.join(__dirname, '../../src')
      const requiredDirs = ['domain', 'features', 'infra', 'main']

      requiredDirs.forEach((dir) => {
        const dirPath = path.join(basePath, dir)
        expect(fs.existsSync(dirPath)).toBe(true)
      })
    })

    it('domain should have entities, ports, and value-objects', () => {
      const domainPath = path.join(__dirname, '../../src/domain')
      const requiredDirs = ['entities', 'ports', 'value-objects']

      requiredDirs.forEach((dir) => {
        const dirPath = path.join(domainPath, dir)
        expect(fs.existsSync(dirPath)).toBe(true)
      })
    })
  })
})
