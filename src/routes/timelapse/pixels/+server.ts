import type { PrismaClient } from '@prisma/client';
import { json } from '@sveltejs/kit';

declare namespace global {
	let prisma: PrismaClient;
}

const prisma = global.prisma;

const cache = {
	pixels: [] as { color: string; x: number; y: number; createdAt: Date }[],
	newestPixel: new Date(0)
};

export const GET = async (request) => {

  console.time('timelapse');
	const pixels = await prisma.pixel.findMany({
		where: {
			createdAt: {
				gt: cache.newestPixel
			}
		},
		select: {
			color: true,
			x: true,
			y: true,
			createdAt: true
		}
	});
  console.timeEnd('timelapse');


	pixels.forEach((pixel) => {
		cache.pixels.push(pixel);
	});
	cache.newestPixel = new Date();

	return json({
		pixels: cache.pixels
	});
};
