import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

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
