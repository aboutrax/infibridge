<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Switch from '$lib/components/ui/switch/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Toaster, toast } from 'svelte-sonner';
	import PlusIcon from '~icons/material-symbols/add';
	import TrashIcon from '~icons/material-symbols/delete-outline';
	import LinkIcon from '~icons/material-symbols/link';
	import KeyIcon from '~icons/material-symbols/key';
	import FolderIcon from '~icons/material-symbols/folder-outline';
	import CopyIcon from '~icons/material-symbols/content-copy';
	import CheckIcon from '~icons/material-symbols/check';
	import WebhookIcon from '~icons/material-symbols/webhook';
	import ServiceIcon from '~icons/icons8/services';
	import ProjectIcon from '~icons/pajamas/project';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import convexIcon from '$lib/assets/img/convex-icon.png';
	import DokployIcon from '~icons/emojione-monotone/whale';
	import type { ActionData, PageData } from './$types';
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { hasPermission } from '$lib/permission-check';
	import { page } from '$app/state';
	import { breadcrumb } from '$lib/stores/breadcrumb.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	$effect(() =>
		breadcrumb.set([
			{ label: 'Projects', href: resolve('/workspace/project') },
			{ label: data.project.name, href: page.url.href }
		])
	);

	const roles = $derived(data.user.role ?? '');

	// Sheet state
	let sheetOpen = $state(false);
	let loading = $state(false);
	let serviceType = $state<'dokploy' | 'convex'>('dokploy');

	// Shared select state (reset on close)
	let infisicalEnvId = $state<string | undefined>(undefined);
	let dokployAppType = $state<string>('application');

	const infisicalEnvTriggerContent = $derived(
		data.envs.find((d) => d.id === infisicalEnvId)?.name ?? 'Select an environment'
	);
	const appTypeTriggerContent = $derived(dokployAppType === 'compose' ? 'Compose' : 'Application');

	// Derived: is this form's error targeting the open sheet?
	const formError = $derived(
		form?.message && form?.action === (serviceType === 'dokploy' ? 'createDokploy' : 'createConvex')
			? form.message
			: null
	);

	// Misc UI state
	let copiedId = $state<string | null>(null);

	const totalServices = $derived(data.dokployServices.length + data.convexServices.length);

	function resetForm() {
		infisicalEnvId = undefined;
		dokployAppType = 'application';
	}

	function openSheet(type: 'dokploy' | 'convex') {
		serviceType = type;
		sheetOpen = true;
	}

	function getWebhookUrl(
		prefix: string,
		infisicalProjectId: string,
		envSlug: string,
		secretPath: string
	): string {
		const pathSegment = secretPath === '/' ? '' : secretPath;
		const base = browser
			? `${window.location.origin}/${prefix}/${infisicalProjectId}/${envSlug}`
			: `/${prefix}/${infisicalProjectId}/${envSlug}`;
		return `${base}${pathSegment}`;
	}

	async function copyWebhookUrl(id: string, url: string) {
		await navigator.clipboard.writeText(url);
		copiedId = id;
		setTimeout(() => (copiedId = null), 2000);
	}
</script>

<svelte:head>
	<title>{data.project.name}</title>
</svelte:head>

<Toaster />

<div class="flex flex-col gap-6 p-6">
	<!-- Header -->
	<div class="flex flex-wrap items-center justify-between gap-2">
		<div>
			<h1 class="flex items-center gap-1 text-2xl font-bold">
				<ProjectIcon />{data.project.name}
			</h1>
			<p class="text-sm text-muted-foreground">Manage service bridges for this project</p>
		</div>
		<div class="flex items-center gap-2">
			{#if hasPermission(roles, 'dokployService', 'create') || hasPermission(roles, 'convexService', 'create')}
				<Select.Root
					type="single"
					value={undefined}
					onValueChange={(v) => {
						if (v) openSheet(v as 'dokploy' | 'convex');
					}}
				>
					<Select.Trigger>
						<PlusIcon />
						New Service
					</Select.Trigger>
					<Select.Content>
						{#if hasPermission(roles, 'dokployService', 'create')}
							<Select.Item value="dokploy">
								<DokployIcon font-size={16} class="shrink-0" />
								Dokploy
							</Select.Item>
						{/if}
						{#if hasPermission(roles, 'convexService', 'create')}
							<Select.Item value="convex">
								<img src={convexIcon} alt="Convex" class="size-4 shrink-0" />
								Convex
							</Select.Item>
						{/if}
					</Select.Content>
				</Select.Root>
			{/if}
		</div>
	</div>

	<!-- Sheet (shared, swaps content based on serviceType) -->
	<Sheet.Root bind:open={sheetOpen}>
		<Sheet.Content class="overflow-y-auto sm:max-w-lg">
			<Sheet.Header>
				<Sheet.Title>
					{serviceType === 'dokploy' ? 'New Dokploy Service' : 'New Convex Service'}
				</Sheet.Title>
				<Sheet.Description>
					{serviceType === 'dokploy'
						? 'Configure the Dokploy and Infisical credentials for this bridge.'
						: 'Configure the Infisical and Convex credentials for this bridge.'}
				</Sheet.Description>
			</Sheet.Header>

			<!-- ── Dokploy form ─────────────────────────────────────────────── -->
			{#if serviceType === 'dokploy'}
				<form
					method="POST"
					action="?/createDokploy"
					id="create-form"
					class="flex flex-col gap-4 px-4 py-4"
					use:enhance={() => {
						loading = true;
						return async ({ update }) => {
							await update();
							loading = false;
							if (!form?.message) {
								sheetOpen = false;
								resetForm();
							}
						};
					}}
				>
					<div class="grid gap-1.5">
						<Label for="dk-name">Service Name</Label>
						<Input id="dk-name" name="name" placeholder="My App" required />
					</div>

					<Separator />
					<p class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
						Dokploy
					</p>

					<div class="grid gap-1.5">
						<Label for="dk-url">Dokploy URL</Label>
						<Input
							id="dk-url"
							name="dokploy_url"
							placeholder="https://dokploy.example.com"
							required
						/>
					</div>
					<div class="grid gap-1.5">
						<Label for="dk-token">API Token</Label>
						<Input
							id="dk-token"
							name="dokploy_api_token"
							type="password"
							placeholder="••••••••"
							required
						/>
						<p class="text-xs text-muted-foreground">Settings → Profile → API/CLI.</p>
					</div>
					<div class="grid gap-1.5">
						<Label for="dk-app-type">App Type</Label>
						<Select.Root type="single" name="dokploy_app_type" bind:value={dokployAppType} required>
							<Select.Trigger id="dk-app-type" class="w-full"
								>{appTypeTriggerContent}</Select.Trigger
							>
							<Select.Content>
								<Select.Item value="application">Application</Select.Item>
								<Select.Item value="compose">Compose</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
					<div class="grid gap-1.5">
						<Label for="dk-app-id">
							{dokployAppType === 'compose' ? 'Compose ID' : 'Application ID'}
						</Label>
						<Input
							id="dk-app-id"
							name="dokploy_app_id"
							placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
							required
						/>
						<p class="text-xs text-muted-foreground">Found in the URL when viewing the service.</p>
					</div>

					<Separator />
					<p class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
						Infisical
					</p>

					<div class="grid gap-1.5">
						<Label for="dk-inf-url">Infisical URL</Label>
						<Input
							id="dk-inf-url"
							name="infisical_url"
							placeholder="https://app.infisical.com"
							required
						/>
					</div>
					<div class="grid gap-1.5">
						<Label for="dk-inf-cid">Client ID</Label>
						<Input
							id="dk-inf-cid"
							name="infisical_client_id"
							placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
							required
						/>
					</div>
					<div class="grid gap-1.5">
						<Label for="dk-inf-csecret">Client Secret</Label>
						<Input
							id="dk-inf-csecret"
							name="infisical_client_secret"
							type="password"
							placeholder="••••••••"
							required
						/>
					</div>
					<div class="grid gap-1.5">
						<Label for="dk-inf-pid">Project ID</Label>
						<Input
							id="dk-inf-pid"
							name="infisical_project_id"
							placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
							required
						/>
					</div>
					<div class="grid gap-1.5">
						<Label for="dk-inf-env">Environment</Label>
						{#if data.envs.length === 0}
							<p class="text-xs text-destructive">
								No environments found.
								<a href={resolve('/workspace/infisical-env')} class="underline">Create one first</a
								>.
							</p>
						{:else}
							<Select.Root
								type="single"
								name="infisical_env_id"
								bind:value={infisicalEnvId}
								required
							>
								<Select.Trigger id="dk-inf-env" class="w-full"
									>{infisicalEnvTriggerContent}</Select.Trigger
								>
								<Select.Content>
									{#each data.envs as env (env.id)}
										<Select.Item value={env.id}>
											{env.name}
											<span class="ml-1 font-mono text-xs text-muted-foreground"
												>{env.environment}</span
											>
										</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
							<div class="mt-2 grid gap-1.5">
								<Label for="dk-inf-path">Secret Path</Label>
								<Input
									id="dk-inf-path"
									name="infisical_secret_path"
									placeholder="/"
									value="/"
									required
								/>
								<p class="text-xs text-muted-foreground">e.g. /, /backend, /frontend</p>
							</div>
						{/if}
					</div>

					<Separator />
					<p class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
						Webhook
					</p>
					<div class="grid gap-1.5">
						<Label for="dk-webhook">Webhook Secret</Label>
						<Input
							id="dk-webhook"
							name="webhook_secret"
							type="password"
							placeholder="••••••••"
							required
						/>
					</div>

					{#if formError}
						<Alert.Root variant="destructive">
							<AlertCircleIcon />
							<Alert.Title>Error</Alert.Title>
							<Alert.Description>{formError}</Alert.Description>
						</Alert.Root>
					{/if}
				</form>

				<!-- ── Convex form ──────────────────────────────────────────────── -->
			{:else}
				<form
					method="POST"
					action="?/createConvex"
					id="create-form"
					class="flex flex-col gap-4 px-4 py-4"
					use:enhance={() => {
						loading = true;
						return async ({ update }) => {
							await update();
							loading = false;
							if (!form?.message) {
								sheetOpen = false;
								resetForm();
							}
						};
					}}
				>
					<div class="grid gap-1.5">
						<Label for="cx-name">Service Name</Label>
						<Input id="cx-name" name="name" placeholder="My App" required />
					</div>

					<Separator />
					<p class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
						Convex
					</p>

					<div class="grid gap-1.5">
						<Label for="cx-url">Convex URL</Label>
						<Input id="cx-url" name="convex_url" placeholder="https://xxx.convex.cloud" required />
					</div>
					<div class="grid gap-1.5">
						<Label for="cx-key">Deploy Key</Label>
						<Input
							id="cx-key"
							name="convex_deploy_key"
							type="password"
							placeholder="prod:xxx..."
							required
						/>
					</div>

					<Separator />
					<p class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
						Infisical
					</p>

					<div class="grid gap-1.5">
						<Label for="cx-inf-url">Infisical URL</Label>
						<Input
							id="cx-inf-url"
							name="infisical_url"
							placeholder="https://app.infisical.com"
							required
						/>
					</div>
					<div class="grid gap-1.5">
						<Label for="cx-inf-cid">Client ID</Label>
						<Input
							id="cx-inf-cid"
							name="infisical_client_id"
							placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
							required
						/>
					</div>
					<div class="grid gap-1.5">
						<Label for="cx-inf-csecret">Client Secret</Label>
						<Input
							id="cx-inf-csecret"
							name="infisical_client_secret"
							type="password"
							placeholder="••••••••"
							required
						/>
					</div>
					<div class="grid gap-1.5">
						<Label for="cx-inf-pid">Project ID</Label>
						<Input
							id="cx-inf-pid"
							name="infisical_project_id"
							placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
							required
						/>
					</div>
					<div class="grid gap-1.5">
						<Label for="cx-inf-env">Environment</Label>
						{#if data.envs.length === 0}
							<p class="text-xs text-destructive">
								No environments found.
								<a href={resolve('/workspace/infisical-env')} class="underline">Create one first</a
								>.
							</p>
						{:else}
							<Select.Root
								type="single"
								name="infisical_env_id"
								bind:value={infisicalEnvId}
								required
							>
								<Select.Trigger id="cx-inf-env" class="w-full"
									>{infisicalEnvTriggerContent}</Select.Trigger
								>
								<Select.Content>
									{#each data.envs as env (env.id)}
										<Select.Item value={env.id}>
											{env.name}
											<span class="ml-1 font-mono text-xs text-muted-foreground"
												>{env.environment}</span
											>
										</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
							<div class="mt-2 grid gap-1.5">
								<Label for="cx-inf-path">Secret Path</Label>
								<Input
									id="cx-inf-path"
									name="infisical_secret_path"
									placeholder="/"
									value="/"
									required
								/>
								<p class="text-xs text-muted-foreground">e.g. /, /backend, /frontend</p>
							</div>
						{/if}
					</div>

					<Separator />
					<p class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
						Webhook
					</p>
					<div class="grid gap-1.5">
						<Label for="cx-webhook">Webhook Secret</Label>
						<Input
							id="cx-webhook"
							name="webhook_secret"
							type="password"
							placeholder="••••••••"
							required
						/>
					</div>

					{#if formError}
						<Alert.Root variant="destructive">
							<AlertCircleIcon />
							<Alert.Title>Error</Alert.Title>
							<Alert.Description>{formError}</Alert.Description>
						</Alert.Root>
					{/if}
				</form>
			{/if}

			<Sheet.Footer class="px-4">
				<Button variant="outline" onclick={() => (sheetOpen = false)}>Cancel</Button>
				<Button type="submit" form="create-form" disabled={loading}>
					{loading ? 'Creating...' : 'Create'}
				</Button>
			</Sheet.Footer>
		</Sheet.Content>
	</Sheet.Root>

	<!-- Empty state -->
	{#if totalServices === 0}
		<Card.Root class="border-dashed">
			<Card.Content class="flex flex-col items-center justify-center gap-3 py-16 text-center">
				<div class="rounded-full bg-muted p-4">
					<ServiceIcon class="text-muted-foreground" font-size={28} />
				</div>
				<div>
					<p class="font-medium">No services yet</p>
					<p class="text-sm text-muted-foreground">
						Create your first Infisical bridge to get started.
					</p>
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			<!-- ── Dokploy cards (first) ──────────────────────────────────── -->
			{#each data.dokployServices as service (service.id)}
				{@const webhookUrl = getWebhookUrl(
					'dokploy',
					service.infisicalProjectId,
					service.envSlug ?? '',
					service.infisicalSecretPath ?? '/'
				)}
				<div class="relative min-w-0">
					<div class="absolute -top-2 -right-1 z-10">
						<span
							class="inline-flex size-3.5 rounded-full {service.activatedAt
								? 'bg-primary'
								: 'bg-muted-foreground'}"
						></span>
					</div>
					<Card.Root class="gap-4">
						<Card.Header>
							<div class="flex items-center justify-between gap-2 truncate">
								<Card.Title class="flex items-center gap-1 truncate">
									<DokployIcon font-size={24} class="shrink-0" />
									<span class="truncate">
										{service.name}
									</span>
								</Card.Title>
								<div class="flex shrink-0 items-center gap-1">
									{#if service.envSlug}
										<Badge variant="secondary" class="font-mono text-xs">{service.envSlug}</Badge>
									{/if}
									<Badge variant="outline" class="font-mono text-xs">{service.dokployAppType}</Badge
									>
								</div>
							</div>
						</Card.Header>
						<Card.Content class="flex flex-col gap-1.5">
							<div class="flex items-center gap-2 text-xs text-muted-foreground">
								<LinkIcon class="shrink-0" />
								<span class="truncate">{service.dokployUrl}</span>
							</div>
							<div class="flex items-center gap-2 text-xs text-muted-foreground">
								<KeyIcon class="shrink-0" />
								<span class="truncate font-mono">{service.dokployAppId}</span>
							</div>
							<div class="flex items-center gap-2 text-xs text-muted-foreground">
								<FolderIcon class="shrink-0" />
								<span class="truncate font-mono">{service.infisicalSecretPath}</span>
							</div>
							<div class="flex items-center gap-2 text-xs text-muted-foreground">
								<WebhookIcon class="shrink-0" />
								<span class="truncate font-mono">{webhookUrl}</span>
								<button
									class="shrink-0 transition-all hover:scale-125 hover:text-primary"
									onclick={(e) => {
										e.preventDefault();
										copyWebhookUrl(service.id, webhookUrl);
									}}
								>
									{#if copiedId === service.id}<CheckIcon />{:else}<CopyIcon />{/if}
								</button>
							</div>
						</Card.Content>
						<Card.Footer class="flex items-center justify-between">
							<div>
								{#if hasPermission(roles, 'dokployService', 'update')}
									<form
										method="POST"
										action={service.activatedAt ? '?/deactivateDokploy' : '?/activateDokploy'}
										use:enhance={() =>
											async ({ update }) =>
												update()}
									>
										<input type="hidden" name="id" value={service.id} />
										<Switch.Root
											checked={!!service.activatedAt}
											onclick={(e) => {
												e.preventDefault();
												(e.currentTarget as HTMLElement).closest('form')?.requestSubmit();
											}}
										/>
									</form>
								{/if}
							</div>
							<div>
								{#if hasPermission(roles, 'dokployService', 'delete')}
									<form
										method="POST"
										action="?/deleteDokploy"
										use:enhance={() =>
											async ({ result, update }) => {
												if (result.type === 'failure') {
													toast.error(
														(result.data?.message as string) ?? 'Failed to delete service.'
													);
													return;
												}
												await update();
											}}
									>
										<input type="hidden" name="id" value={service.id} />
										<Button
											type="submit"
											variant="ghost"
											size="icon"
											class="text-muted-foreground hover:text-destructive"
											onclick={(e) => {
												e.preventDefault();
												if (confirm(`Delete "${service.name}"?`)) {
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
				</div>
			{/each}

			<!-- ── Convex cards (second) ──────────────────────────────────── -->
			{#each data.convexServices as service (service.id)}
				{@const webhookUrl = getWebhookUrl(
					'convex',
					service.infisicalProjectId,
					service.envSlug ?? '',
					service.infisicalSecretPath ?? '/'
				)}
				<div class="relative min-w-0">
					<div class="absolute -top-2 -right-1 z-10">
						<span
							class="inline-flex size-3.5 rounded-full {service.activatedAt
								? 'bg-primary'
								: 'bg-muted-foreground'}"
						></span>
					</div>
					<Card.Root class="gap-4">
						<Card.Header>
							<div class="flex items-center justify-between gap-2 truncate">
								<Card.Title class="flex items-center gap-1 truncate">
									<img src={convexIcon} alt="Convex" class="size-6" />
									<span class="truncate">
										{service.name}
									</span>
								</Card.Title>
								{#if service.envSlug}
									<Badge variant="secondary" class="shrink-0 font-mono text-xs"
										>{service.envSlug}</Badge
									>
								{/if}
							</div>
						</Card.Header>
						<Card.Content class="flex flex-col gap-1.5">
							<div class="flex items-center gap-2 text-xs text-muted-foreground">
								<LinkIcon class="shrink-0" />
								<span class="truncate">{service.convexUrl}</span>
							</div>
							<div class="flex items-center gap-2 text-xs text-muted-foreground">
								<KeyIcon class="shrink-0" />
								<span class="truncate">{service.infisicalUrl}</span>
							</div>
							<div class="flex items-center gap-2 text-xs text-muted-foreground">
								<FolderIcon class="shrink-0" />
								<span class="truncate font-mono">{service.infisicalSecretPath}</span>
							</div>
							<div class="flex items-center gap-2 text-xs text-muted-foreground">
								<WebhookIcon class="shrink-0" />
								<span class="truncate font-mono">{webhookUrl}</span>
								<button
									class="shrink-0 transition-all hover:scale-125 hover:text-primary"
									onclick={(e) => {
										e.preventDefault();
										copyWebhookUrl(service.id, webhookUrl);
									}}
								>
									{#if copiedId === service.id}<CheckIcon />{:else}<CopyIcon />{/if}
								</button>
							</div>
						</Card.Content>
						<Card.Footer class="flex items-center justify-between">
							<div>
								{#if hasPermission(roles, 'convexService', 'update')}
									<form
										method="POST"
										action={service.activatedAt ? '?/deactivateConvex' : '?/activateConvex'}
										use:enhance={() =>
											async ({ update }) =>
												update()}
									>
										<input type="hidden" name="id" value={service.id} />
										<Switch.Root
											checked={!!service.activatedAt}
											onclick={(e) => {
												e.preventDefault();
												(e.currentTarget as HTMLElement).closest('form')?.requestSubmit();
											}}
										/>
									</form>
								{/if}
							</div>
							<div>
								{#if hasPermission(roles, 'convexService', 'delete')}
									<form
										method="POST"
										action="?/deleteConvex"
										use:enhance={() =>
											async ({ result, update }) => {
												if (result.type === 'failure') {
													toast.error(
														(result.data?.message as string) ?? 'Failed to delete service.'
													);
													return;
												}
												await update();
											}}
									>
										<input type="hidden" name="id" value={service.id} />
										<Button
											type="submit"
											variant="ghost"
											size="icon"
											class="text-muted-foreground hover:text-destructive"
											onclick={(e) => {
												e.preventDefault();
												if (confirm(`Delete "${service.name}"?`)) {
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
				</div>
			{/each}
		</div>
	{/if}
</div>
