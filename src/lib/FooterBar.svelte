<script>
	import MediaQuery from '$lib/MediaQuery.svelte';
</script>

<MediaQuery query="(min-width: 500px)" let:matches>
	{#if matches}
		<div
			class="wrapper w-[450px] mb-6 mt-2 bubble-text min-h-[2.5rem] max-h-[2.5rem] rounded-2xl flex flex-row items-center justify-between rounded-tr-none rounded-tl-none pl-4 pr-1 py-4 drop-shadow-xl"
		>
			Visit GitHub for the source of all my public projects
			<div
				class="w-8 h-8 drop-shadow-lg hover:scale-105 hover:cursor-pointer transition-transform border-success hover:border-[1.5px] rounded-tr-2 rounded-full"
			>
				<a href="https://github.com/Khazoda" target="_blank" rel="noreferrer" class="w-8"
					><img src="/github_white.svg" alt="" />
				</a>
			</div>
		</div>
	{/if}
</MediaQuery>

<MediaQuery query="(max-width: 499px)" let:matches>
	{#if matches}
		<div class="w-full px-6 mb-6">
			<div
				class="bubble-text w-full relative h-10 bg-sky-600 mobile-card rounded-2xl drop-shadow-lg rounded-t-none px-2 py-2 mt-2 flex flex-row items-center justify-center "
			>
				<div class="w-8 h-8 drop-shadow-lg rounded-full">
					<a href="https://github.com/Khazoda" target="_blank" rel="noreferrer" class="w-8"
						><img src="/github_white.svg" alt="" />
					</a>
				</div>
			</div>
		</div>
	{/if}
</MediaQuery>

<style>
	.bubble-text {
		--tw-bg-opacity: 1;
		background-color: hsl(var(--n) / var(--tw-bg-opacity));
		--tw-text-opacity: 1;
		color: hsl(var(--nc) / var(--tw-text-opacity));
	}
</style>
