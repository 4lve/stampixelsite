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

	let pixelBoard: HTMLDivElement;

	let creditsOpen = false;
	const zoomStore = writable({ x: 0, y: 0, k: 1 });

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

	let Pixels = new Map<string, Color>();

	let selectedColor = colors[0];

	function onHover(e: MouseEvent | FocusEvent) {
		if (window.matchMedia('(pointer: coarse)').matches) return;
		const target = e.target as HTMLButtonElement;
		target.style.backgroundColor = selectedColor;
	}

	function onBlur(e: MouseEvent | FocusEvent) {
		if (window.matchMedia('(pointer: coarse)').matches) return;
		const target = e.target as HTMLButtonElement;
		target.style.backgroundColor = Pixels.get(target.id) ?? 'black';
	}

	function setPixel(x: number, y: number) {
		if (!$page.data.session?.user) {
			toast.error('Du måste logga in för att kunna sätta ut pixlar.', {
				position: 'bottom-right'
			});
			return;
		}

		socket.emit('setPixel', { x, y, color: selectedColor }, (message, success) => {
			if (success) {
				toast.success(message, {
					position: 'bottom-right'
				});
			} else {
				toast.error(message, {
					position: 'bottom-right'
				});
			}
		});
	}

	//Socket events

	let balance = 0;

	socket.on('setPixel', (pixel) => {
		Pixels.set(`${pixel.x},${pixel.y}`, pixel.color as Color);
		Pixels = Pixels;
	});

	socket.on('setBoard', (board) => {
		for (const [key, value] of Object.entries(board)) {
			Pixels.set(key, value as Color);
		}
		Pixels = Pixels;
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
				class="btn bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
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

{#if creditsOpen}
	<div
		class="fixed z-10 inset-0 overflow-y-auto"
		style="display: grid; place-items: center; background-color: rgba(0, 0, 0, 0.5);"
	>
		<div
			class="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-headline"
		>
			<div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
				<div class="sm:flex sm:items-start">
					<div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
						<h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-headline">Credits</h3>
						<div class="mt-2">
							<p class="text-sm text-gray-500">
								Webbsida + backend: <a
									href="https://discord.com/users/347818082787393539"
									target="_blank"
									class="text-blue-500">4lve</a
								>
								<br />
								Hosting:
								<a
									href="https://discord.com/users/237179694154383361"
									target="_blank"
									class="text-blue-500">Smurre</a
								>
								<br />
								Koppling till Stamsites pixel display:
								<a
									href="https://discord.com/users/286753300899168256"
									target="_blank"
									class="text-blue-500">WikiRaze</a
								>
							</p>
						</div>
						<h3 class="text-lg leading-6 font-medium text-gray-900 mt-4" id="modal-headline">
							Instriktioner
						</h3>
						<div class="mt-2">
							<p class="text-sm text-gray-500">
								1. Logga in med Twitch
								<br />
								2. Köp pixlar när Stamsite är live med kanalpoäng
								<br />
								3. Välj en färg och klicka på en pixel för att sätta ut den
							</p>
							<h3 class="text-lg leading-6 font-medium text-gray-900 mt-4" id="modal-headline">
								Varning
							</h3>
							<p class="text-sm text-red-500">Oläpliga ritningar kan få dig bannad</p>
						</div>
					</div>
				</div>
			</div>
			<div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
				<button
					type="button"
					class="mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
					on:click={() => (creditsOpen = false)}
				>
					Stäng
				</button>
			</div>
		</div>
	</div>
{/if}

<div
	class="flex justify-center w-screen h-[calc(100svh-56px)] overflow-hidden"
	bind:this={pixelBoard}
>
	<button
		on:click={() => (creditsOpen = true)}
		class="top-[65px] right-2 absolute text-white font-bold px-3 py-1 bg-blue-600 rounded hover:bg-blue-700"
		>i</button
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
						on:click={() => setPixel(x, y)}
						on:mouseover={onHover}
						on:focus={onHover}
						on:mouseout={onBlur}
						on:blur={onBlur}
						id="{x},{y}"
						style="background-color: {Pixels.get(`${x},${y}`) ?? 'black'}"
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
