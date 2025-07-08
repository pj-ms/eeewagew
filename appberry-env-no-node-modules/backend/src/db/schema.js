import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const dummyTable = sqliteTable('dummy', {
    id: text('id').primaryKey(),
    description: text('description').notNull(),
});
