<script lang="ts">
	import { socket } from '$lib/socket';
	import { signIn, signOut } from '@auth/sveltekit/client';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import toast from 'svelte-french-toast';

	const colors = {
		red: '#ff0000',
		green: '#00ff00',
		blue: '#0000ff',
		yellow: '#ffff00',
		orange: '#ff7f00',
		purple: '#7f00ff',
		cyan: '#00ffff',
		white: '#ffffff',
		black: '#000000',
		gray: '#7f7f7f'
	};

	type Color = keyof typeof colors;
	let selectedPixels = new Map<string, Color>();
	

	let selectedColor: Color = 'black';

	function selectColor(color: Color) {
		selectedColor = color;
	}

	function onHover(e: MouseEvent) {
		const target = e.target as HTMLButtonElement;
		target.style.backgroundColor = colors[selectedColor];
	}

	function onBlur(e: MouseEvent) {
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

	socket.on('setPixel', (pixel) => {
		selectedPixels.set(`${pixel.x},${pixel.y}`, pixel.color as Color);
		selectedPixels = selectedPixels;
	});

	let balance = 0;

	socket.on('balance', (newBalance) => {
		balance = newBalance;
	});

	socket.on('setBoard', (board) => {
		for (const [key, value] of Object.entries(board)) {
			selectedPixels.set(key, value as Color);
		}
		selectedPixels = selectedPixels;
	});

	type Entries<T> = {
		[K in keyof T]: [K, T[K]];
	}[keyof T][];

	class TypedObject {
		static entries<T extends object>(obj: T) {
			return Object.entries(obj) as Entries<T>;
		}
	}
</script>

{#if $page.data.session?.user}
	<button on:click={signOut}>Logga ut</button>
	<p>Logged in as {$page.data.session.user.name}</p>
	<p>Balance {balance}</p>
{:else}
	<button on:click={() => signIn('twitch')}>Logga in</button>
{/if}
<div class="flex items-center justify-center flex-col w-screen h-screen">
	{#each Array(32) as _, y}
		<div class="m-0 flex flex-row">
			{#each Array(32) as _, x}
				<button
					class="h-6 w-6 border-[1px] border-black"
					id={`${x},${y}`}
					style={`background-color: ${selectedPixels.get(`${x},${y}`) || 'transparent'};`}
					on:mouseleave={onBlur}
					on:mouseenter={onHover}
					on:click={() => setPixel(x, y)}
				/>
			{/each}
		</div>
	{/each}

	<div class="mt-10">
		{#each TypedObject.entries(colors) as [colorKey, colorValue]}
			<button
				class="h-6 w-6 border-2 border-black"
				style="background-color: {colorValue}"
				on:click={() => selectColor(colorKey)}
			/>
		{/each}
	</div>
</div>

<style>
	:global(html) {
		background-color: #363636;
	}
</style>
