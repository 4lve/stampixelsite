import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';

declare namespace global {
	let prisma: PrismaClient;
}

const prisma = global.prisma;

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
