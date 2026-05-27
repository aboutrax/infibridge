<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { resolve } from '$app/paths';

	import EnvIcon from '~icons/eos-icons/env';
	import DashboardIcon from '~icons/material-symbols/dashboard-outline';
	import ProjectIcon from '~icons/pajamas/project';
	import ProfileIcon from '~icons/iconamoon/profile';

	import logo from '$lib/assets/img/logo.png';

	import UserButton from '$lib/components/user/UserButton.svelte';
	import { page } from '$app/state';
	import { hasPermission } from '$lib/permission-check';

	let { currentUser } = $props();

	let roles = $derived(currentUser?.role ?? '');

	const { setOpenMobile } = Sidebar.useSidebar();

	const items = $derived([
		{
			title: 'Dashboard',
			url: resolve('/workspace/dashboard'),
			icon: DashboardIcon,
			canView: true
		},
		{
			title: 'Projects',
			url: resolve('/workspace/project'),
			icon: ProjectIcon,
			canView: hasPermission(roles, 'project', 'view')
		}
	]);

	const settingItems = $derived([
		{
			title: 'Infisical Envs',
			url: resolve('/workspace/infisical-env'),
			icon: EnvIcon,
			canView: hasPermission(roles, 'infisicalEnv', 'view')
		},
		{
			title: 'Profile',
			url: resolve('/workspace/profile'),
			icon: ProfileIcon,
			canView: hasPermission(roles, 'profile', 'view')
		}
	]);
</script>

<Sidebar.Root collapsible="icon" variant="floating">
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton>
					{#snippet child({ props })}
						<a href={resolve('/workspace/dashboard')} {...props}>
							<img src={logo} alt="Infibridge Logo" class="size-8 shrink-0" />
							<span class="text-xl font-semibold">
								Infi<span class="text-blue-500">bridge</span>
							</span>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupLabel>Home</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					{#each items as item (item.title)}
						{#if item.canView}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton isActive={page.url.pathname.startsWith(item.url)}>
									{#snippet child({ props })}
										<a href={item.url} {...props} onclick={() => setOpenMobile(false)}>
											<item.icon />
											<span>{item.title}</span>
										</a>
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						{/if}
					{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
		{#if settingItems.some((item) => item.canView)}
			<Sidebar.Group>
				<Sidebar.GroupLabel>Settings</Sidebar.GroupLabel>
				<Sidebar.GroupContent>
					<Sidebar.Menu>
						{#each settingItems as item (item.title)}
							{#if item.canView}
								<Sidebar.MenuItem>
									<Sidebar.MenuButton isActive={page.url.pathname.startsWith(item.url)}>
										{#snippet child({ props })}
											<a href={item.url} {...props} onclick={() => setOpenMobile(false)}>
												<item.icon />
												<span>{item.title}</span>
											</a>
										{/snippet}
									</Sidebar.MenuButton>
								</Sidebar.MenuItem>
							{/if}
						{/each}
					</Sidebar.Menu>
				</Sidebar.GroupContent>
			</Sidebar.Group>
		{/if}
	</Sidebar.Content>
	<Sidebar.Footer>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<UserButton {currentUser} />
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Footer>
</Sidebar.Root>
