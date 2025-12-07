import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './electron/libs/db/schema.ts',
  out: './electron/libs/db/migrations',
  dialect: 'sqlite',
})
