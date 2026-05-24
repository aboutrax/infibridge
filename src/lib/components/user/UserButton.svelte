<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';

	import ProfileIcon from '~icons/iconamoon/profile';
	import LogoutIcon from '~icons/material-symbols/logout';
	import ChevronUpDownIcon from '~icons/heroicons/chevron-up-down';
	import ThemeSwitcher from '$lib/components/app/ThemeSwitcher.svelte';
	import { authClient } from '$lib/auth-client';
	import { toast } from 'svelte-sonner';

	let { currentUser } = $props();

	function getAvatarInitials(name: string): string {
		if (!name) return '';

		const parts = name.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);

		if (parts.length >= 2) {
			return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
		}

		// Single name fallback
		const single = parts[0];
		return single.slice(0, 2).toUpperCase();
	}

	async function signOut() {
		const result = await authClient.signOut({
			fetchOptions: {
				onSuccess: async () => {
					await goto(resolve('/'), { invalidateAll: true });
					// location.reload();
				}
			}
		});
		if (result.error) {
			toast.error('Error', { description: result.error.message });
		}
	}
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<button {...props} class="w-full rounded-2xl hover:bg-accent">
				<div class="flex w-full items-center gap-2">
					<Avatar.Root class="shrink-0">
						<Avatar.Image src={currentUser?.image} alt="user picture" />
						<Avatar.Fallback class="">
							{getAvatarInitials(currentUser?.name ?? '')}
						</Avatar.Fallback>
					</Avatar.Root>

					<div class="flex min-w-0 flex-col text-start">
						<span class="truncate text-sm font-medium">
							{currentUser?.name}
						</span>
						<span class="truncate text-xs text-muted-foreground">
							{currentUser?.email}
						</span>
					</div>

					<ChevronUpDownIcon font-size={24} class="ms-auto" />
				</div>
			</button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content class="w-56" align="start">
		<DropdownMenu.Item class="flex items-center justify-between gap-2">
			<div class="flex min-w-0 flex-1 flex-col">
				<span class="font-bold">My Account</span>
				<span class="truncate text-xs text-foreground">
					{currentUser.email}
				</span>
			</div>
			<div class="shrink-0">
				<ThemeSwitcher />
			</div>
		</DropdownMenu.Item>
		<DropdownMenu.Separator />
		<DropdownMenu.Group>
			<DropdownMenu.Item>
				<a href={resolve('/workspace/profile')} class="flex w-full items-center gap-2 text-start">
					<ProfileIcon /> Profile
				</a>
			</DropdownMenu.Item>
		</DropdownMenu.Group>
		<DropdownMenu.Separator />
		<DropdownMenu.Item onclick={signOut}>
			<LogoutIcon /> Logout
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>
