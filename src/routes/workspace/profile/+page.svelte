<script>
	import { page } from '$app/state';
	import PageSkeleton from '$lib/components/other/PageSkeleton.svelte';
	import { breadcrumb } from '$lib/stores/breadcrumb.svelte';

	breadcrumb.set([
		{
			label: 'Profile',
			href: page.url.href
		}
	]);
</script>

<svelte:head>
	<title>Profile</title>
</svelte:head>

<PageSkeleton />
