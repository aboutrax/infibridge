<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import ThemeSwitcher from '$lib/components/app/ThemeSwitcher.svelte';

	import * as Alert from '$lib/components/ui/alert/index.js';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';

	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Setup</title>
</svelte:head>

<main class="flex min-h-[inherit] items-center justify-center p-4">
	<Card.Root class="w-full max-w-sm">
		<Card.Header>
			<Card.Title>Setup admin account</Card.Title>
			<Card.Description>Enter your email below to setup your account</Card.Description>
			<Card.Action>
				<ThemeSwitcher />
			</Card.Action>
		</Card.Header>
		<Card.Content>
			<form method="post" action="?/signUpEmail" id="form" use:enhance>
				<div class="flex flex-col gap-6">
					<div class="grid gap-2">
						<Label for="email">Email</Label>
						<Input type="email" id="email" name="email" placeholder="m@example.com" required />
					</div>
					<div class="grid gap-2">
						<Label for="password">Password</Label>
						<Input type="password" id="password" name="password" required />
					</div>
					<div class="grid gap-2">
						<Label for="name">Name</Label>
						<Input type="text" id="name" name="name" required />
					</div>
				</div>
			</form>

			{#if form?.message}
				<Alert.Root variant="destructive" class="mt-4">
					<AlertCircleIcon />
					<Alert.Title>Error</Alert.Title>
					<Alert.Description>
						{form.message}
					</Alert.Description>
				</Alert.Root>
			{/if}
		</Card.Content>
		<Card.Footer class="flex-col gap-2">
			<Button type="submit" form="form" class="w-full">Register</Button>
		</Card.Footer>
	</Card.Root>
</main>
