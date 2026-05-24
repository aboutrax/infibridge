<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
</script>

<div class="min-h-[inherit] w-full space-y-6 p-6">
	<div class="flex items-center space-x-4">
		<Skeleton class="size-12 rounded-full" />
		<div class="flex-1 space-y-2">
			<Skeleton class="h-4 w-1/3" />
			<Skeleton class="h-4 w-1/4" />
		</div>
	</div>

	<div class="space-y-4">
		<Skeleton class="h-6 w-1/2" />
		<Skeleton class="h-4 w-full" />
		<Skeleton class="h-4 w-full" />
		<Skeleton class="h-4 w-5/6" />
	</div>

	<div class="grid grid-cols-3 gap-4">
		<Skeleton class="h-full rounded-lg" />
		<Skeleton class="h-32 rounded-lg" />
		<Skeleton class="h-32 rounded-lg" />
	</div>
</div>
