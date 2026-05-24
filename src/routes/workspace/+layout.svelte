<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';

	import AppSidebar from '$lib/components/app/AppSidebar.svelte';
	import AppBreadcrumb from '$lib/components/app/AppBreadcrumb.svelte';
	import PageSkeleton from '$lib/components/other/PageSkeleton.svelte';

	let { data, children } = $props();

	const currentUser = $derived(data.user);

	let scrolled = $state(false);
</script>

<svelte:window onscroll={() => (scrolled = window.scrollY > 0)} />

{#if !currentUser}
	<PageSkeleton />
{:else}
	<Sidebar.Provider>
		<AppSidebar {currentUser} />
		<main class="w-full md:pt-4">
			<div
				class={`sticky top-0 z-50 flex items-center border-b bg-background/10 p-2 backdrop-blur-lg md:mb-2 md:border-b-0 ${
					scrolled ? 'rounded-none' : ''
				}`}
			>
				<Sidebar.Trigger class="md:ms-2 [&>svg]:size-6!" />
				<AppBreadcrumb />
			</div>
			<div class="bg-accent md:mx-2 md:rounded-xl md:border md:p-3">
				<div class="bg-background md:rounded-xl">
					{@render children?.()}
				</div>
			</div>
		</main>
	</Sidebar.Provider>
{/if}
