import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { dummyTable } from './db/schema';

const app = new Hono<{ Bindings: Env }>();
app.use(
	'*',
	cors({
		origin: (_origin, c) => c.env.CORS_ORIGIN,
		credentials: true,
	}),
);

// Existing routes are provided for demonstration purposes only.
// API routes must ALWAYS be prefixed with /api, to differentiate them from routes that should serve the frontend's static assets.
const routes = app
	.get('/api', async (c) => {
		return c.text('Hello World!');
	})
	// $ curl -X POST "http://localhost:8787/api/echo" -H "Content-Type: application/json" -d '{"field1": "value1", "field2": 5}'
	// {"field1":"value1","field2":5}
	.post(
		'/api/echo',
		zValidator(
			'json',
			z.object({
				field1: z.string(),
				field2: z.number(),
			}),
		),
		async (c) => {
			const { field1, field2 } = c.req.valid('json');
			return c.json({ field1, field2 });
		},
	)
	.get('/api/d1-demo', async (c) => {
		const db = drizzle(c.env.DB);
		await db.delete(dummyTable).where(eq(dummyTable.id, 'test_id'));
		// Should not typically write data in a GET route. This is for demonstration purposes only.
		await db.insert(dummyTable).values({ id: 'test_id', description: 'test description' });
		const result = await db.select().from(dummyTable);
		return c.json(result);
	});

export default app;
export type AppType = typeof routes;
