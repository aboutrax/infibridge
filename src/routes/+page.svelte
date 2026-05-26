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
	<title>Home</title>
</svelte:head>

<main class="flex min-h-[inherit] items-center justify-center p-4">
	<Card.Root class="w-full max-w-sm">
		<Card.Header>
			<Card.Title>Login to your account</Card.Title>
			<Card.Description>Enter your email below to login to your account</Card.Description>
			<Card.Action>
				<ThemeSwitcher />
			</Card.Action>
		</Card.Header>
		<Card.Content>
			<form method="post" action="?/signInEmail" id="form" use:enhance>
				<div class="flex flex-col gap-6">
					<div class="grid gap-2">
						<Label for="email">Email</Label>
						<Input type="email" id="email" name="email" placeholder="m@example.com" required />
					</div>
					<div class="grid gap-2">
						<div class="flex items-center">
							<Label for="password">Password</Label>
							<!-- <a href="##" class="ms-auto inline-block text-sm underline-offset-4 hover:underline">
								Forgot your password?
							</a> -->
						</div>
						<Input type="password" id="password" name="password" required />
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
			<Button type="submit" form="form" class="w-full">Login</Button>
		</Card.Footer>
	</Card.Root>
</main>
