import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { eq } from 'drizzle-orm'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { app } from 'electron'
import * as schema from './schema'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const getDbPath = () => {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'nekta-studio.db')
}

const getMigrationsPath = () => {
  // In development, migrations are in the source directory
  // In production, they're bundled with the app
  const isDev = process.env.VITE_DEV_SERVER_URL
  if (isDev) {
    return path.join(process.env.APP_ROOT || '', 'electron/libs/db/migrations')
  }
  return path.join(__dirname, 'migrations')
}

let db: ReturnType<typeof drizzle> | null = null
let sqlite: Database.Database | null = null

const generateUid = () => {
  return crypto.randomUUID()
}

const ensureDefaultLibrary = (db: ReturnType<typeof drizzle>) => {
  const defaultLib = db
    .select()
    .from(schema.libraries)
    .where(eq(schema.libraries.isDefault, true))
    .get()

  if (!defaultLib) {
    db.insert(schema.libraries).values({
      uid: generateUid(),
      name: 'Default',
      isDefault: true,
    }).run()
  }
}

export const initDb = () => {
  if (!db) {
    const dbPath = getDbPath()
    sqlite = new Database(dbPath)
    sqlite.pragma('journal_mode = WAL')
    db = drizzle(sqlite, { schema })

    // Run migrations
    migrate(db, { migrationsFolder: getMigrationsPath() })

    // Ensure default library exists
    ensureDefaultLibrary(db)
  }
  return db
}

export const getDb = () => {
  if (!db) {
    return initDb()
  }
  return db
}

export const closeDb = () => {
  if (sqlite) {
    sqlite.close()
    sqlite = null
    db = null
  }
}

export { schema, generateUid }
