<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import PlusIcon from '~icons/material-symbols/add';
	import TrashIcon from '~icons/material-symbols/delete-outline';
	import EditIcon from '~icons/material-symbols/edit-outline';
	import EnvIcon from '~icons/eos-icons/env';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import type { ActionData, PageData } from './$types';
	import * as Switch from '$lib/components/ui/switch/index.js';
	import { hasPermission } from '$lib/permission-check';
	import { toast } from 'svelte-sonner';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const roles = $derived(data.user.role ?? '');

	let sheetOpen = $state(false);
	let editSheetOpen = $state(false);
	let loading = $state(false);
	let selectedEnv = $state<PageData['envs'][0] | null>(null);

	function openEdit(env: PageData['envs'][0]) {
		selectedEnv = env;
		editSheetOpen = true;
	}
</script>

<svelte:head>
	<title>Infisical Environments</title>
</svelte:head>

<div class="flex flex-col gap-6 p-6">
	<!-- Header -->
	<div class="flex flex-wrap items-center justify-between gap-2">
		<div>
			<h1 class="flex items-center gap-1 text-2xl font-bold"><EnvIcon /> Infisical Environments</h1>
			<p class="text-sm text-muted-foreground">
				Manage environment definitions used by your bridges
			</p>
		</div>
		<Sheet.Root bind:open={sheetOpen}>
			{#if hasPermission(roles, 'infisicalEnv', 'create')}
				<Sheet.Trigger>
					{#snippet child({ props })}
						<Button {...props}>
							<PlusIcon />
							New Environment
						</Button>
					{/snippet}
				</Sheet.Trigger>
			{/if}
			<Sheet.Content class="sm:max-w-sm">
				<Sheet.Header>
					<Sheet.Title>New Environment</Sheet.Title>
					<Sheet.Description>
						Define an Infisical environment to use in your bridge projects.
					</Sheet.Description>
				</Sheet.Header>

				<form
					method="POST"
					action="?/create"
					id="create-form"
					class="flex flex-col gap-4 px-4 py-4"
					use:enhance={() => {
						loading = true;
						return async ({ update }) => {
							await update();
							loading = false;
							if (!form?.message) sheetOpen = false;
						};
					}}
				>
					<div class="grid gap-1.5">
						<Label for="name">Display Name</Label>
						<Input id="name" name="name" placeholder="Production" required />
					</div>
					<div class="grid gap-1.5">
						<Label for="environment">Environment Slug</Label>
						<Input id="environment" name="environment" placeholder="prod" required />
						<p class="text-xs text-muted-foreground">
							Must match the slug in Infisical (e.g. dev, staging, prod)
						</p>
					</div>

					{#if form?.message}
						<Alert.Root variant="destructive">
							<AlertCircleIcon />
							<Alert.Title>Error</Alert.Title>
							<Alert.Description>{form.message}</Alert.Description>
						</Alert.Root>
					{/if}
				</form>

				<Sheet.Footer class="px-4">
					<Button variant="outline" onclick={() => (sheetOpen = false)}>Cancel</Button>
					<Button type="submit" form="create-form" disabled={loading}>
						{loading ? 'Creating...' : 'Create'}
					</Button>
				</Sheet.Footer>
			</Sheet.Content>
		</Sheet.Root>
	</div>

	<!-- Edit sheet -->
	<Sheet.Root
		bind:open={editSheetOpen}
		onOpenChange={(open) => {
			if (!open) selectedEnv = null;
		}}
	>
		<Sheet.Content class="sm:max-w-sm">
			<Sheet.Header>
				<Sheet.Title>Edit Environment</Sheet.Title>
				<Sheet.Description>Update the environment name or slug.</Sheet.Description>
			</Sheet.Header>

			{#if selectedEnv}
				<form
					method="POST"
					action="?/update"
					id="edit-form"
					class="flex flex-col gap-4 px-4 py-4"
					use:enhance={() => {
						loading = true;
						return async ({ update }) => {
							await update();
							loading = false;
							if (!form?.message) editSheetOpen = false;
						};
					}}
				>
					<input type="hidden" name="id" value={selectedEnv.id} />
					<div class="grid gap-1.5">
						<Label for="edit-name">Display Name</Label>
						<Input id="edit-name" name="name" value={selectedEnv.name} required />
					</div>
					<div class="grid gap-1.5">
						<Label for="edit-environment">Environment Slug</Label>
						<Input
							id="edit-environment"
							name="environment"
							value={selectedEnv.environment}
							required
						/>
						<p class="text-xs text-muted-foreground">
							Must match the slug in Infisical (e.g. dev, staging, prod)
						</p>
					</div>

					{#if form?.message}
						<Alert.Root variant="destructive">
							<AlertCircleIcon />
							<Alert.Title>Error</Alert.Title>
							<Alert.Description>{form.message}</Alert.Description>
						</Alert.Root>
					{/if}
				</form>
			{/if}

			<Sheet.Footer class="px-4">
				<Button variant="outline" onclick={() => (editSheetOpen = false)}>Cancel</Button>
				<Button type="submit" form="edit-form" disabled={loading}>
					{loading ? 'Saving...' : 'Save'}
				</Button>
			</Sheet.Footer>
		</Sheet.Content>
	</Sheet.Root>

	<!-- Empty state -->
	{#if data.envs.length === 0}
		<Card.Root class="border-dashed">
			<Card.Content class="flex flex-col items-center justify-center gap-3 py-16 text-center">
				<div class="rounded-full bg-muted p-4">
					<EnvIcon class="text-muted-foreground" font-size={28} />
				</div>
				<div>
					<p class="font-medium">No environments yet</p>
					<p class="text-sm text-muted-foreground">
						Create your first environment to use in a bridge project.
					</p>
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="flex flex-col gap-2">
			{#each data.envs as env (env.id)}
				<Card.Root>
					<Card.Content class="flex items-center justify-between">
						<!-- Left: name + slug + activation date -->
						<div class="flex min-w-0 flex-col gap-0.5">
							<p class="text-sm font-medium">{env.name}</p>
							<p class="font-mono text-xs text-muted-foreground">{env.environment}</p>
							{#if env.activatedAt}
								<p class="text-xs text-muted-foreground">
									Active since {new Date(env.activatedAt).toLocaleDateString()}
								</p>
							{:else}
								<p class="text-xs text-muted-foreground">Inactive</p>
							{/if}
						</div>

						<!-- Right: activate/deactivate + edit + delete -->
						<div class="flex shrink-0 items-center">
							{#if hasPermission(roles, 'infisicalEnv', 'update')}
								<form
									method="POST"
									action={env.activatedAt ? '?/deactivate' : '?/activate'}
									use:enhance={() => {
										return async ({ update }) => update();
									}}
									class="me-2"
								>
									<input type="hidden" name="id" value={env.id} />
									<Switch.Root
										checked={!!env.activatedAt}
										onCheckedChange={() => {
											(document.activeElement as HTMLElement)?.closest('form')?.requestSubmit();
										}}
									/>
								</form>
							{/if}

							{#if hasPermission(roles, 'infisicalEnv', 'update')}
								<Button
									variant="ghost"
									size="icon"
									class="text-muted-foreground"
									onclick={() => openEdit(env)}
								>
									<EditIcon />
								</Button>
							{/if}

							{#if hasPermission(roles, 'infisicalEnv', 'delete')}
								<form
									method="POST"
									action="?/delete"
									use:enhance={() => {
										return async ({ result, update }) => {
											if (result.type === 'failure') {
												toast.error(
													(result.data?.message as string) ?? 'Failed to delete environment.'
												);
												return;
											}
											await update();
										};
									}}
								>
									<input type="hidden" name="id" value={env.id} />
									<Button
										type="submit"
										variant="ghost"
										size="icon"
										class="text-muted-foreground hover:text-destructive"
									>
										<TrashIcon />
									</Button>
								</form>
							{/if}
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>
