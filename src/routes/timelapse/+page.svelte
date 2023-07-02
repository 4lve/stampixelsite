<script lang="ts">
	import { socket } from '$lib/socket';
	import { signIn, signOut } from '@auth/sveltekit/client';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import toast from 'svelte-french-toast';
	import { writable } from 'svelte/store';

	import { zoom as d3Zoom } from 'd3-zoom';
	import { select as d3Select } from 'd3-selection';
	import { zoomIdentity } from 'd3-zoom';
	import axios from 'axios';

	let pixelBoard: HTMLDivElement;
	const zoomStore = writable({ x: 0, y: 0, k: 1 });
	type Color = string;
	type Pos = string;
	let DisplayPixels = new Map<Pos, Color>();

	type TimelapsePixel = {
		x: number;
		y: number;
		color: Color;
		createdAt: string;
	};

	type Timelapse = {
		pixels: TimelapsePixel[];
		initialState: Record<Pos, Color>;
	};

	let pixelHistory: TimelapsePixel[] = [];

	$: axios
		.get(`/timelapse/pixels`)
		.then(({ data }: { data: Timelapse }) => {
			pixelHistory = data.pixels.sort((a, b) => {
				const dateA = new Date(a.createdAt);
				const dateB = new Date(b.createdAt);
				return dateA.getTime() - dateB.getTime();
			});
		})
		.catch((err) => {
			console.error(err);
		});

	onMount(() => {
		const div = d3Select(pixelBoard);

		const zoomBehavior = d3Zoom()
			.scaleExtent([0.4, 10])
			.on('zoom', ({ transform }) => {
				const newX = transform.x - pixelBoard.clientWidth / 2;
				const newY = transform.y - pixelBoard.clientHeight / 2;

				zoomStore.set({
					x: newX,
					y: newY,
					k: transform.k
				});
			})
			.filter(function defaultFilter(event) {
				return (!event.ctrlKey || event.type === 'wheel') && (!event.button || event.button === 2);
			});

		div.on('contextmenu', function (event) {
			event.preventDefault();
		});

		div.call(zoomBehavior as any).on('dblclick.zoom', null);

		const initialTransform = zoomIdentity
			.translate(pixelBoard.clientWidth / 2, pixelBoard.clientHeight / 2)
			.scale(1);
		div.call((zoomBehavior as any).transform, initialTransform);
	});

	let startDate = new Date(Date.now()).toDateString();
	let maxRange = 0;
	let stepOnPlay = 1;
	let progress = 0;

	$: {
		const qualifiedPixels: TimelapsePixel[] = [];
		pixelHistory.forEach((pixel) => {
			const date = new Date(pixel.createdAt);
			if (date >= new Date(startDate)) {
				qualifiedPixels.push(pixel);
			}
		});

		maxRange = qualifiedPixels.length;
	}

	$: {
		DisplayPixels = new Map<Pos, Color>();
		const qualifiedPixels: TimelapsePixel[] = [];
		let lowestDate = new Date(Date.now());
		let highestDate = new Date(startDate);
		pixelHistory.forEach((pixel) => {
			const date = new Date(pixel.createdAt);
			if (date >= new Date(startDate)) {
				qualifiedPixels.push(pixel);
				if (date < lowestDate) lowestDate = date;
				if (date > highestDate) highestDate = date;
			}
		});

		qualifiedPixels.slice(0, progress).forEach((pixel) => {
			DisplayPixels.set(`${pixel.x},${pixel.y}`, pixel.color);
		});

		DisplayPixels = DisplayPixels;
	}

	let isPlaying = false;
	let interval: NodeJS.Timeout;

	const play = () => {
		if (isPlaying) {
			isPlaying = false;
			clearInterval(interval);
			return;
		}
		isPlaying = true;
		interval = setInterval(() => {
			if (progress < maxRange) {
				progress += stepOnPlay;
			} else {
				isPlaying = false;
				clearInterval(interval);
			}
		}, 100);
	};
</script>

<nav
	class="flex justify-center items-center p-2 bg-blue-500 text-white z-20 relative font-bold text-xl"
>
	<h1>Timelapse</h1>
</nav>

<div
	class="p-2 pb-1 bg-gray-700 rounded-md absolute bottom-5 left-[50%] z-40"
	style="transform: translate(-50%, 0%);"
>
	{#if pixelHistory.length === 0}
		<p>Laddar ner timelapse data...</p>
	{:else}
		<input type="datetime-local" bind:value={startDate} />
		<input type="range" min="0" max={maxRange} bind:value={progress} />
		<input type="number" min="1" max="100" bind:value={stepOnPlay} title="step" />
		<button on:click={play}> {isPlaying ? 'stop' : 'play'} </button>
	{/if}
</div>

<div
	class="flex justify-center w-screen h-[calc(100svh-44px)] overflow-hidden"
	bind:this={pixelBoard}
>
	<div
		style="
						transform: 
							translate({$zoomStore.x}px, {$zoomStore.y}px) 
							scale({$zoomStore.k})
					"
	>
		{#each Array(64) as _, y}
			<div class="flex">
				{#each Array(64) as _, x}
					<button
						id="{x},{y}"
						style="background-color: {DisplayPixels.get(`${x},${y}`) ?? 'black'}"
						class="w-3 h-3 border-[1px] border-[#444] {x !== 0 && 'border-l-0'} {y !== 0 &&
							'border-t-0'}"
					/>
				{/each}
			</div>
		{/each}
	</div>
</div>

<style>
	:global(html) {
		background-color: #333;
		overflow: hidden;
		position: relative;
	}
</style>
