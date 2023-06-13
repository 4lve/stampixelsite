<script>
	import '../app.postcss';
	import { socket } from '$lib/socket';
	import { onDestroy, onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { Toaster } from 'svelte-french-toast';

	onMount(() => {
		if (browser) socket.connect();
	});

	onDestroy(() => {
		if (browser) socket.disconnect();
	});
</script>

<slot />
<Toaster />
