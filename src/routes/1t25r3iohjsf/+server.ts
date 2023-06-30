import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const inputSchema = z.object({
	username: z.string(),
	pixels: z.preprocess((a) => parseInt(a as string), z.number().int())
});

export async function GET(event) {
	const { username, pixels } = inputSchema.parse(
		Object.fromEntries(event.url.searchParams.entries())
	);

	await prisma.user.updateMany({
		where: {
			name: username
		},
		data: {
			pixels: {
				increment: pixels
			}
		}
	});

	return new Response('Added Pixels');
}
