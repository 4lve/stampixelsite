import type http from 'http';
import { Server } from 'socket.io';
import { z } from 'zod';
import axios from 'axios';
import type { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

await prisma.$connect();

export default async function injectSocketIO(server: http.Server) {
	const io = new Server<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, SocketData>(
		server
	);

	const setPixelSchema = z.object({
		x: z.number().min(0).max(63).int(),
		y: z.number().min(0).max(63).int(),
		color: z
			.string()
			.startsWith('#')
			.max(7)
			.min(7)
			.regex(/^#[0-9a-f]{6}$/i)
			.toUpperCase()
	});

	const Pixels = new Map<string, string>();

	for (let x = 0; x < 64; x++) {
		for (let y = 0; y < 64; y++) {
			(async () => {
				console.log(`Loading pixel ${x},${y}`);
				const pixel = await prisma.pixel.findFirst({
					where: {
						x,
						y
					},
					select: {
						color: true
					},
					orderBy: {
						createdAt: 'desc'
					}
				});
				console.log(`Loaded pixel ${x},${y}`);

				Pixels.set(`${x},${y}`, pixel?.color ?? '#000000');
				io.emit('setPixel', {
					x,
					y,
					color: pixel?.color ?? '#000000'
				});
			})();
		}
	}

	io.on('connection', async (socket) => {
		socket.data.session = null;

		axios
			.get('http://localhost:5173/getSession', {
				headers: socket.handshake.headers
			})
			.then(async (res) => {
				socket.data.session = res.data;
				if (
					!socket.data.session ||
					!socket.data.session.user?.email ||
					!socket.data.session.user?.image ||
					!socket.data.session.user?.name
				)
					return;

				const user = await prisma.user.findUnique({
					where: {
						email: socket.data.session.user.email
					}
				});

				if (!user) return;

				socket.emit('balance', user.pixels);
			});

		socket.emit('setBoard', Object.fromEntries(Pixels));

		socket.on('setPixel', async (userData, callback) => {
			const tmpData = setPixelSchema.safeParse(userData);
			if (!tmpData.success) return;
			if (
				!socket.data.session ||
				!socket.data.session.user?.email ||
				typeof callback !== 'function'
			)
				return;

			const data = tmpData.data;

			if (Pixels.get(`${data.x},${data.y}`) === data.color)
				return callback('En pixel med samma färg är redan där!', false);

			try {
				const [pixelPlacement, spender] = await prisma.$transaction(async (tx) => {
					// 1. Decrement amount from the sender.
					const spender = await tx.user.update({
						where: {
							email: socket.data.session!.user!.email!
						},
						data: {
							pixels: {
								decrement: 1
							}
						}
					});

					// 2. Verify that the sender's balance didn't go below zero.
					if (spender.pixels < 0) {
						throw new Error(`${spender} doesn't have enough pixels`);
					}

					const pixelPlacement = await tx.pixel.create({
						data: {
							color: data.color,
							x: data.x,
							y: data.y,
							user: {
								connect: {
									email: socket.data.session!.user!.email!
								}
							}
						}
					});

					return [pixelPlacement, spender];
				});

				Pixels.set(`${data.x},${data.y}`, data.color);
				socket.emit('balance', spender.pixels);
				io.emit('setPixel', data);
				callback('Placerade pixlen', true);
			} catch (error) {
				console.error(error);
				callback(
					'Du har inte tillräckligt med pixlar. Du kan köpa mer med kanalpoäng när Stamsite streamar på twitch',
					false
				);
			}
		});

		socket.on('disconnect', () => {
			console.log('user disconnected');
		});
	});

	console.log('socket.io injected');
}
