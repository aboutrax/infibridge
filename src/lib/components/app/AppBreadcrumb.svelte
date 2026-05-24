<script>
	import { breadcrumb } from '$lib/stores/breadcrumb.svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb';
</script>

{#if breadcrumb.items.length}
	<Breadcrumb.Root class="min-w-0">
		<Breadcrumb.List class="flex-nowrap">
			{#each breadcrumb.items as item, i (item.label)}
				<Breadcrumb.Separator />
				<Breadcrumb.Item class="min-w-0">
					{#if i !== breadcrumb.items.length - 1}
						<Breadcrumb.Link href={item.href} class="block max-w-32 truncate">
							{item.label}
						</Breadcrumb.Link>
					{:else}
						<Breadcrumb.Page class="block max-w-32 truncate">
							{item.label}
						</Breadcrumb.Page>
					{/if}
				</Breadcrumb.Item>
			{/each}
		</Breadcrumb.List>
	</Breadcrumb.Root>
{/if}
