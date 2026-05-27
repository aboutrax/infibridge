<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import * as Switch from '$lib/components/ui/switch/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Toaster, toast } from 'svelte-sonner';
	import PlusIcon from '~icons/material-symbols/add';
	import TrashIcon from '~icons/material-symbols/delete-outline';
	import EditIcon from '~icons/material-symbols/edit-outline';
	import ProjectIcon from '~icons/pajamas/project';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import BookIcon from '~icons/lucide/book';
	import type { ActionData, PageData } from './$types';
	import { hasPermission } from '$lib/permission-check';
	import { page } from '$app/state';
	import { breadcrumb } from '$lib/stores/breadcrumb.svelte';
	import { resolve } from '$app/paths';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	breadcrumb.set([{ label: 'Projects', href: page.url.href }]);

	const roles = $derived(data.user.role ?? '');

	let sheetOpen = $state(false);
	let editSheetOpen = $state(false);
	let loading = $state(false);
	let selectedProject = $state<PageData['projects'][0] | null>(null);

	function openEdit(p: PageData['projects'][0]) {
		selectedProject = p;
		editSheetOpen = true;
	}
</script>

<svelte:head>
	<title>Projects</title>
</svelte:head>

<Toaster />

<div class="flex flex-col gap-6 p-6">
	<!-- Header -->
	<div class="flex flex-wrap items-center justify-between gap-2">
		<div>
			<h1 class="flex items-center gap-2 text-2xl font-bold"><ProjectIcon />Projects</h1>
			<p class="text-sm text-muted-foreground">
				Manage your Infisical projects and their service bridges
			</p>
		</div>

		{#if hasPermission(roles, 'project', 'create')}
			<Sheet.Root bind:open={sheetOpen}>
				<Sheet.Trigger>
					{#snippet child({ props })}
						<Button {...props}>
							<PlusIcon />
							New Project
						</Button>
					{/snippet}
				</Sheet.Trigger>
				<Sheet.Content class="sm:max-w-sm">
					<Sheet.Header>
						<Sheet.Title>New Project</Sheet.Title>
						<Sheet.Description>
							Create a project to group your Infisical service bridges.
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
							<Label for="name">Project Name</Label>
							<Input id="name" name="name" placeholder="My App" required />
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
		{/if}
	</div>

	<!-- Edit sheet -->
	{#if hasPermission(roles, 'project', 'update')}
		<Sheet.Root
			bind:open={editSheetOpen}
			onOpenChange={(open) => {
				if (!open) selectedProject = null;
			}}
		>
			<Sheet.Content class="sm:max-w-sm">
				<Sheet.Header>
					<Sheet.Title>Edit Project</Sheet.Title>
					<Sheet.Description>Update the project name.</Sheet.Description>
				</Sheet.Header>

				{#if selectedProject}
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
						<input type="hidden" name="id" value={selectedProject.id} />
						<div class="grid gap-1.5">
							<Label for="edit-name">Project Name</Label>
							<Input id="edit-name" name="name" value={selectedProject.name} required />
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
	{/if}

	<!-- Empty state -->
	{#if data.projects.length === 0}
		<Card.Root class="border-dashed">
			<Card.Content class="flex flex-col items-center justify-center gap-3 py-16 text-center">
				<div class="rounded-full bg-muted p-4">
					<ProjectIcon class="text-muted-foreground" font-size={28} />
				</div>
				<div>
					<p class="font-medium">No projects yet</p>
					<p class="text-sm text-muted-foreground">
						Create your first project to start bridging Infisical secrets.
					</p>
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.projects as project (project.id)}
				<div class="relative min-w-0">
					<!-- Ping indicator -->
					<div class="absolute -top-2 -right-1 z-10">
						{#if project.activatedAt}
							<span class="inline-flex size-3.5 rounded-full bg-primary"></span>
						{:else}
							<span class="inline-flex size-3.5 rounded-full bg-muted-foreground"></span>
						{/if}
					</div>

					<a
						href={resolve('/workspace/project/[projectId]', { projectId: project.id })}
						class="block"
					>
						<Card.Root class="cursor-pointer gap-4 hover:bg-accent/80">
							<Card.Header>
								<Card.Title class="flex items-center gap-1 truncate"
									><BookIcon class="shrink-0" />
									<span class="truncate">
										{project.name}
									</span>
								</Card.Title>
								<Card.Description class="text-xs">
									{project.serviceCount}
									{project.serviceCount === 1 ? 'service' : 'services'}
								</Card.Description>
							</Card.Header>

							<Card.Footer class="flex items-center justify-between">
								<div class="flex items-center">
									{#if hasPermission(roles, 'project', 'update')}
										<form
											method="POST"
											action={project.activatedAt ? '?/deactivate' : '?/activate'}
											use:enhance={() => {
												return async ({ update }) => update();
											}}
										>
											<input type="hidden" name="id" value={project.id} />
											<Switch.Root
												checked={!!project.activatedAt}
												onclick={(e) => {
													e.preventDefault();
													e.stopPropagation();
													(e.currentTarget as HTMLElement).closest('form')?.requestSubmit();
												}}
											/>
										</form>
									{/if}
								</div>
								<div class="flex items-center">
									{#if hasPermission(roles, 'project', 'update')}
										<Button
											variant="ghost"
											size="icon"
											class="text-muted-foreground"
											onclick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												openEdit(project);
											}}
										>
											<EditIcon />
										</Button>
									{/if}
									{#if hasPermission(roles, 'project', 'delete')}
										<form
											method="POST"
											action="?/delete"
											use:enhance={() => {
												return async ({ result, update }) => {
													if (result.type === 'failure') {
														toast.error(
															(result.data?.message as string) ?? 'Failed to delete project.'
														);
														return;
													}
													await update();
												};
											}}
										>
											<input type="hidden" name="id" value={project.id} />
											<Button
												type="submit"
												variant="ghost"
												size="icon"
												class="text-muted-foreground hover:text-destructive"
												onclick={(e) => {
													e.preventDefault();
													e.stopPropagation();
													if (
														confirm(
															`Delete "${project.name}"? This will also delete all associated services.`
														)
													) {
														(e.currentTarget as HTMLElement).closest('form')?.requestSubmit();
													}
												}}
											>
												<TrashIcon />
											</Button>
										</form>
									{/if}
								</div>
							</Card.Footer>
						</Card.Root>
					</a>
				</div>
			{/each}
		</div>
	{/if}
</div>
