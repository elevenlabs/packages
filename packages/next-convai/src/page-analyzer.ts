import fs from 'fs-extra'
import path from 'path'
import { glob } from 'glob'
import matter from 'gray-matter'
import * as cheerio from 'cheerio'

export interface PageMetadata {
  title?: string
  description?: string
  keywords?: string[]
  purpose?: string
  navigation?: {
    section?: string
    parent?: string
    children?: string[]
  }
  customFields?: Record<string, any>
}

export interface PageInfo {
  filePath: string
  route: string
  type: 'page' | 'layout' | 'component'
  metadata?: PageMetadata
  content?: string
  exports?: string[]
}

export interface SiteAnalysis {
  pages: PageInfo[]
  routes: string[]
  sitemap: Record<string, any>
  metadata: {
    globalMeta: PageMetadata
    pageSpecificMeta: Record<string, PageMetadata>
  }
}

export class PageAnalyzer {
  constructor(private projectDir: string) {}

  async analyzePagesStructure(): Promise<SiteAnalysis> {
    const config = await this.loadConfig()
    const pages: PageInfo[] = []
    const routes: string[] = []

    // Analyze pages directory (Pages Router)
    const pagesDir = path.join(this.projectDir, 'pages')
    if (await fs.pathExists(pagesDir)) {
      const pagesFiles = await this.findPageFiles(pagesDir, 'pages/**/*.{js,jsx,ts,tsx}')
      for (const file of pagesFiles) {
        const pageInfo = await this.analyzePageFile(file, 'pages')
        pages.push(pageInfo)
        if (pageInfo.route) routes.push(pageInfo.route)
      }
    }

    // Analyze app directory (App Router)
    const appDir = path.join(this.projectDir, 'app')
    if (await fs.pathExists(appDir)) {
      const appFiles = await this.findPageFiles(appDir, 'app/**/*.{js,jsx,ts,tsx}')
      for (const file of appFiles) {
        const pageInfo = await this.analyzePageFile(file, 'app')
        pages.push(pageInfo)
        if (pageInfo.route) routes.push(pageInfo.route)
      }
    }

    // Generate sitemap
    const sitemap = this.generateSitemap(pages)

    // Extract global and page-specific metadata
    const metadata = this.extractMetadata(pages)

    return {
      pages,
      routes: [...new Set(routes)], // Remove duplicates
      sitemap,
      metadata
    }
  }

  private async findPageFiles(baseDir: string, pattern: string): Promise<string[]> {
    try {
      const files = await glob(pattern, { cwd: this.projectDir, absolute: true })
      return files.filter((f: string) => !f.includes('/api/')) // Exclude API routes
    } catch (error) {
      throw error
    }
  }

  private async analyzePageFile(filePath: string, routerType: 'pages' | 'app'): Promise<PageInfo> {
    const content = await fs.readFile(filePath, 'utf-8')
    const relativePath = path.relative(this.projectDir, filePath)
    
    // Generate route from file path
    const route = this.filePathToRoute(relativePath, routerType)
    
    // Extract metadata from comments, frontmatter, or JSDoc
    const metadata = this.extractPageMetadata(content, filePath)
    
    // Determine page type
    const fileName = path.basename(filePath, path.extname(filePath))
    const type = this.determinePageType(fileName, content)
    
    // Extract exports for component analysis
    const exports = this.extractExports(content)

    return {
      filePath: relativePath,
      route,
      type,
      metadata,
      content: content.slice(0, 1000), // First 1000 chars for context
      exports
    }
  }

  private filePathToRoute(filePath: string, routerType: 'pages' | 'app'): string {
    const pathWithoutExt = filePath.replace(/\.(js|jsx|ts|tsx)$/, '')
    
    if (routerType === 'pages') {
      const route = pathWithoutExt
        .replace(/^pages/, '')
        .replace(/\/index$/, '')
        .replace(/\[([^\]]+)\]/g, ':$1') // Dynamic routes
        
      return route || '/'
    } else {
      // App router
      const route = pathWithoutExt
        .replace(/^app/, '')
        .replace(/\/page$/, '')
        .replace(/\/layout$/, '')
        .replace(/\[([^\]]+)\]/g, ':$1')
        .replace(/\(([^)]+)\)/g, '') // Route groups
        .replace(/\/+/g, '/') // Clean up multiple slashes
        
      return route || '/'
    }
  }

  private extractPageMetadata(content: string, filePath: string): PageMetadata | undefined {
    const metadata: PageMetadata = {}

    // Try to extract from frontmatter (if using gray-matter)
    try {
      const parsed = matter(content)
      if (parsed.data && Object.keys(parsed.data).length > 0) {
        Object.assign(metadata, parsed.data)
      }
    } catch (e) {
      // Not frontmatter, continue
    }

    // Extract from JSDoc comments
    const jsdocMatch = content.match(/\/\*\*\s*([\s\S]*?)\s*\*\//)
    if (jsdocMatch) {
      const jsdoc = jsdocMatch[1]
      
      const titleMatch = jsdoc.match(/@title\s+(.+)/)
      if (titleMatch) metadata.title = titleMatch[1].trim()
      
      const descMatch = jsdoc.match(/@description\s+(.+)/)
      if (descMatch) metadata.description = descMatch[1].trim()
      
      const purposeMatch = jsdoc.match(/@purpose\s+(.+)/)
      if (purposeMatch) metadata.purpose = purposeMatch[1].trim()
      
      const sectionMatch = jsdoc.match(/@section\s+(.+)/)
      if (sectionMatch) {
        metadata.navigation = { section: sectionMatch[1].trim() }
      }
    }

    // Extract from Head component or metadata export
    const headMatch = content.match(/<Head[^>]*>([\s\S]*?)<\/Head>/)
    if (headMatch) {
      const $ = cheerio.load(headMatch[1])
      
      const title = $('title').text()
      if (title) metadata.title = title
      
      const description = $('meta[name="description"]').attr('content')
      if (description) metadata.description = description
      
      const keywords = $('meta[name="keywords"]').attr('content')
      if (keywords) metadata.keywords = keywords.split(',').map(k => k.trim())
    }

    // Extract from Next.js 13+ metadata export
    const metadataExportMatch = content.match(/export\s+const\s+metadata\s*=\s*\{([\s\S]*?)\}/)
    if (metadataExportMatch) {
      try {
        // Simple parsing of metadata object
        const metaStr = metadataExportMatch[1]
        const titleMatch = metaStr.match(/title:\s*['"`]([^'"`]+)['"`]/)
        if (titleMatch) metadata.title = titleMatch[1]
        
        const descMatch = metaStr.match(/description:\s*['"`]([^'"`]+)['"`]/)
        if (descMatch) metadata.description = descMatch[1]
      } catch (e) {
        // Continue if parsing fails
      }
    }

    return Object.keys(metadata).length > 0 ? metadata : undefined
  }

  private determinePageType(fileName: string, content: string): 'page' | 'layout' | 'component' {
    if (fileName === 'layout' || fileName === '_app') return 'layout'
    if (content.includes('export default') && content.includes('function')) return 'page'
    return 'component'
  }

  private extractExports(content: string): string[] {
    const exports: string[] = []
    
    // Default export
    const defaultExportMatch = content.match(/export\s+default\s+(?:function\s+)?(\w+)/)
    if (defaultExportMatch) exports.push(defaultExportMatch[1])
    
    // Named exports
    const namedExportsMatches = content.matchAll(/export\s+(?:const|function)\s+(\w+)/g)
    for (const match of namedExportsMatches) {
      exports.push(match[1])
    }
    
    return exports
  }

  private generateSitemap(pages: PageInfo[]): Record<string, any> {
    const sitemap: Record<string, any> = {}
    
    for (const page of pages) {
      if (page.route && page.type === 'page') {
        sitemap[page.route] = {
          title: page.metadata?.title,
          description: page.metadata?.description,
          section: page.metadata?.navigation?.section,
          purpose: page.metadata?.purpose
        }
      }
    }
    
    return sitemap
  }

  private extractMetadata(pages: PageInfo[]): { globalMeta: PageMetadata; pageSpecificMeta: Record<string, PageMetadata> } {
    const pageSpecificMeta: Record<string, PageMetadata> = {}
    const globalMeta: PageMetadata = {}
    
    for (const page of pages) {
      if (page.metadata && page.route) {
        pageSpecificMeta[page.route] = page.metadata
      }
    }
    
    return { globalMeta, pageSpecificMeta }
  }

  private async loadConfig() {
    const configPath = path.join(this.projectDir, '.convai', 'config.json')
    if (await fs.pathExists(configPath)) {
      return await fs.readJson(configPath)
    }
    return {}
  }
}