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
		x: z.number().min(0).max(31).int(),
		y: z.number().min(0).max(31).int(),
		color: z.string()
	});

	const Pixels = new Map<string, string>();

	const coordinates = [];
	for (let x = 0; x < 32; x++) {
		for (let y = 0; y < 32; y++) {
			coordinates.push({ x, y });
		}
	}

	const oneDayAgo = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);

	prisma.placement
		.groupBy({
			by: ['x', 'y'],
			where: {
				x: { in: Array.from({ length: 32 }, (_, i) => i) },
				y: { in: Array.from({ length: 32 }, (_, i) => i) },
				createdAt: {
					gte: oneDayAgo
				}
			},
			_max: {
				color: true,
				createdAt: true
			},
			orderBy: {
				_max: {
					createdAt: 'desc'
				}
			}
		})
		.then((placements) => {
			placements.forEach((placement) => {
				const key = `${placement.x},${placement.y}`;
				if (!Pixels.has(key)) Pixels.set(key, placement._max.color || 'white');
			});

			console.log('Done');
			io.emit('setBoard', Object.fromEntries(Pixels));
		});

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

				const existing = await prisma.user.findUnique({
					where: {
						email: socket.data.session.user.email
					}
				});

				if (!existing) {
					await prisma.user.create({
						data: {
							email: socket.data.session.user.email,
							name: socket.data.session.user.name,
							image: socket.data.session.user.image
						}
					});
					return;
				}

				socket.emit('balance', existing.balance);
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

			try {
				const [pixelPlacement, spender] = await prisma.$transaction(async (tx) => {
					// 1. Decrement amount from the sender.
					const spender = await tx.user.update({
						where: {
							email: socket.data.session!.user!.email!
						},
						data: {
							balance: {
								decrement: 1
							}
						}
					});

					// 2. Verify that the sender's balance didn't go below zero.
					if (spender.balance < 0) {
						throw new Error(`${spender} doesn't have enough pixels`);
					}

					const pixelPlacement = await tx.placement.create({
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
				socket.emit('balance', spender.balance);
				io.emit('setPixel', data);
				callback('Pixel placed', true);
			} catch (error) {
				console.error(error);
				callback('Not enough balance', false);
			}
		});

		socket.on('disconnect', () => {
			console.log('user disconnected');
		});
	});

	console.log('socket.io injected');
}
