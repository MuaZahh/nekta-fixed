import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

// Content manifest tracking - stores hash to detect changes
export const contentManifest = sqliteTable('content_manifest', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  manifestUrl: text('manifest_url').notNull().unique(),
  contentHash: text('content_hash').notNull(),
  version: text('version'),
  lastCheckedAt: integer('last_checked_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Media content from CDN manifest
export const mediaContent = sqliteTable('media_content', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uid: text('uid').notNull().unique(),
  url: text('url').notNull().unique(),
  type: text('type').notNull(), // 'video' | 'image' | 'audio'
  category: text('category').notNull(), // 'background', etc.
  tags: text('tags', { mode: 'json' }).$type<string[]>().default([]),
  name: text('name'),
  size: integer('size'), // in bytes
  localPath: text('local_path'), // path to downloaded file
  downloadedAt: integer('downloaded_at', { mode: 'timestamp' }),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const libraries = sqliteTable('libraries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uid: text('uid').notNull().unique(),
  name: text('name').notNull(),
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const mediaAssets = sqliteTable('media_assets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uid: text('uid').notNull().unique(),
  libraryId: integer('library_id').references(() => libraries.id).notNull(),
  name: text('name').notNull(),
  filePath: text('file_path').notNull(),
  type: text('type').notNull(), // 'video' | 'audio' | 'image'
  duration: integer('duration'), // in milliseconds, for video/audio
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const cacheFiles = sqliteTable('cache_files', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uid: text('uid').notNull().unique(),
  filePath: text('file_path').notNull(),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(), // in bytes
  category: text('category').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
})
