import fs from 'fs'
import path from 'path'

interface VersionInfo {
  version: string
  buildDate: string
  commitHash: string
  environment: string
}

class VersionService {
  private versionInfo: VersionInfo

  constructor() {
    this.versionInfo = this.loadVersionInfo()
  }

  private loadVersionInfo(): VersionInfo {
    try {
      const versionPath = path.join(process.cwd(), 'version.json')
      const versionData = fs.readFileSync(versionPath, 'utf8')
      return JSON.parse(versionData)
    } catch (error) {
      console.error('Error loading version info:', error)
      return {
        version: '0.0.0',
        buildDate: new Date().toISOString(),
        commitHash: 'unknown',
        environment: 'development'
      }
    }
  }

  public getVersionInfo(): VersionInfo {
    return this.versionInfo
  }

  public getVersion(): string {
    return this.versionInfo.version
  }

  public getEnvironment(): string {
    return this.versionInfo.environment
  }

  public getBuildDate(): string {
    return this.versionInfo.buildDate
  }

  public getCommitHash(): string {
    return this.versionInfo.commitHash
  }
}

export const versionService = new VersionService() 