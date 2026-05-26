<script>
	import { resolve } from '$app/paths';
	import logo from '$lib/assets/img/logo.png';
	import ThemeSwitcher from '$lib/components/app/ThemeSwitcher.svelte';
</script>

<div class="flex items-center justify-between p-2 md:mx-48">
	<div>
		<a href={resolve('/')}>
			<img src={logo} alt="Infibridge Logo" class="size-14" />
		</a>
	</div>
	<ThemeSwitcher />
</div>
