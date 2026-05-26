<script lang="ts">
	import './layout.css';
	import logo from '$lib/assets/img/logo.png';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from 'svelte-sonner';

	import { page } from '$app/state';
	import AppHeader from '$lib/components/app/AppHeader.svelte';
	import AppFooter from '$lib/components/app/AppFooter.svelte';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={logo} /></svelte:head>

<ModeWatcher />
<Toaster richColors={true} position="top-right" closeButton />

<div class="flex min-h-[inherit] flex-col justify-between">
	{#if !page.url.pathname.startsWith('/workspace')}
		<AppHeader />
	{/if}

	{@render children()}

	{#if !page.url.pathname.startsWith('/workspace')}
		<AppFooter />
	{/if}
</div>
