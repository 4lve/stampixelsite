<script lang="ts">
	import { socket } from '$lib/socket';
	import { signIn, signOut } from '@auth/sveltekit/client';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import toast from 'svelte-french-toast';
	import { writable } from 'svelte/store';

	import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom';
	import { select as d3Select } from 'd3-selection';
	import { browser } from '$app/environment';

	let pixelBoard: HTMLDivElement;

	const zoomStore = writable({ x: 0, y: 50, k: 1 });

	onMount(() => {
		const svg = d3Select(pixelBoard);
		const zoomBehavior = d3Zoom()
			.scaleExtent([1, 10])
			.on('zoom', ({ transform }) => {
				zoomStore.set({
					x: transform.x,
					y: transform.y,
					k: transform.k
				});
			});

		const initialX = (pixelBoard.parentElement!.parentElement!.clientWidth - 192) / 4;
		const initialY = (pixelBoard.parentElement!.parentElement!.clientHeight - 192) / 20;

		svg
			.call(zoomBehavior as any)
			.call(zoomBehavior.transform as any, zoomIdentity.translate(-initialX, initialY));
	});

	const colors = [
		'#ff0000',
		'#00ff00',
		'#0000ff',
		'#ffff00',
		'#ff7f00',
		'#7f00ff',
		'#00ffff',
		'#ffffff',
		'#000000',
		'#7f7f7f'
	];

	type Color = string;

	let selectedPixels = new Map<string, Color>();

	let selectedColor = colors[0];

	function onHover(e: MouseEvent | FocusEvent) {
		const target = e.target as HTMLButtonElement;
		target.style.backgroundColor = selectedColor;
	}

	function onBlur(e: MouseEvent | FocusEvent) {
		const target = e.target as HTMLButtonElement;
		target.style.backgroundColor = selectedPixels.get(target.id) ?? 'transparent';
	}

	function setPixel(x: number, y: number) {
		socket.emit('setPixel', { x, y, color: selectedColor }, (message, success) => {
			if (success) {
				toast.success(message);
			} else {
				toast.error(message);
			}
		});
	}

	//Socket events

	let balance = 0;

	socket.on('setPixel', (pixel) => {
		selectedPixels.set(`${pixel.x},${pixel.y}`, pixel.color as Color);
		selectedPixels = selectedPixels;
	});

	socket.on('setBoard', (board) => {
		for (const [key, value] of Object.entries(board)) {
			selectedPixels.set(key, value as Color);
		}
		selectedPixels = selectedPixels;
	});

	socket.on('balance', (newBalance) => {
		balance = newBalance;
	});
</script>

<nav class="flex justify-between items-center p-2 bg-blue-500 text-white z-20 relative">
	<div>
		{#if $page.data.session?.user}
			<button
				class="btn bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
				on:click={signOut}>Logga ut</button
			>
		{:else}
			<button
				class="btn bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
				on:click={() => signIn('twitch')}>Logga in med Twitch</button
			>
		{/if}
	</div>

	<div>
		{#if $page.data.session?.user}
			<p class="font-bold">Antal Pixlar: {balance}</p>
		{/if}
	</div>

	<div>
		{#if $page.data.session?.user}
			<p class="font-bold">Inloggad som: {$page.data.session.user.name}</p>
		{/if}
	</div>
</nav>

<div
	class="flex justify-center w-screen h-[calc(100svh-56px)] overflow-hidden"
	bind:this={pixelBoard}
>
	<div class="p-2 pb-1 bg-gray-700 rounded-md absolute bottom-5 z-20">
		{#each colors as color}
			<button
				on:click={() => {
					selectedColor = color;
				}}
				style="background-color: {color}; outline-color: {selectedColor === color
					? 'white'
					: 'black'}"
				class="w-8 h-8 mx-1 outline-dotted rounded"
			/>
		{/each}
	</div>
	<div class="absolute">
		<div
			id="pixel-board"
			class="absolute"
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
							on:click={() => setPixel(x, y)}
							on:mouseover={onHover}
							on:focus={onHover}
							on:mouseout={onBlur}
							on:blur={onBlur}
							id="{x},{y}"
							style="background-color: {selectedPixels.get(`${x},${y}`) ?? 'transparent'}"
							class="w-3 h-3 border-[1px] border-black {x !== 0 && 'border-l-0'} {y !== 0 &&
								'border-t-0'}"
						/>
					{/each}
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	:global(html) {
		background-color: #fff;
		overflow: hidden;
	}
</style>
