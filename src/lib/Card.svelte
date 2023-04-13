<script>
	import { slide } from 'svelte/transition';
	import MediaQuery from '$lib/MediaQuery.svelte';

	export let siteName = 'Default';
	export let siteHref = '/';
	export let siteDescription = 'Default description of site very longvery longvery long ';
	export let siteWingding = '/personal_site.png';
</script>

<!-- 
<div class="card max-w-[450px] max-h-[150px] m-6 bg-base-100 shadow-xl image-full  ">
	<figure><img src={siteBackground} alt="Shoes" /></figure>
	<div class="card-body">
		<h2 class="card-title">{siteName}</h2>
		<p>{siteDescription}</p>
		<div class="card-actions justify-end">
			<button class="btn btn-primary">Visit Website</button>
		</div>
	</div>
</div> -->

<MediaQuery query="(max-width: 499px)" let:matches>
	{#if matches}
		<a
			href={siteHref}
			target="_blank"
			rel="noopener noreferrer"
			class="prose relative w-full h-16 mobile-card drop-shadow-lg px-2 py-2 flex flex-row items-center justify-start "
		>
			<img class="h-14 m-0" src={siteWingding} alt="" />
			<h3 class=" m-0 ml-8 overflow-hidden overflow-ellipsis text-sm sm:text-lg">{siteName}</h3>
			<div class="absolute top-2 right-2 w-6 h-6 m-0 ">
				<img class="m-0" src="/external_white.svg" alt="" />
			</div>
		</a>
	{/if}
</MediaQuery>

<MediaQuery query="(min-width: 500px)" let:matches>
	{#if matches}
		<a
			href={siteHref}
			target="_blank"
			rel="noopener noreferrer"
			id="card-wrapper"
			class="card-grid drop-shadow-lg bg-[url('/card-bg.svg')] bg-no-repeat bg-cover outline-success rounded-none"
		>
			<h1 id="card-title" class="text-2xl pl-4 pt-2">{siteName}</h1>
			<img
				id="card-wingding"
				src={siteWingding}
				alt={siteWingding}
				class="w-20 ml-auto pt-4 pr-4 pl-2 pb-2"
			/>
			<div id="card-description" class="row-span-2 p-4 pb-2 text-gray-300">
				{siteDescription}
			</div>

			<button
				id="card-button"
				class="relative btn btn-outline btn-success shadow col-start-2 col-end-2 row-start-3 row-end-3 z-10 rounded-none rounded-br-none self-end hover:rounded-br-3xl transition-all"
				>Visit Website</button
			>
		</a>
	{/if}
</MediaQuery>

<style lang="css">
	.card-grid {
		position: relative;
		margin: 0.5rem;
		max-width: 450px;
		max-height: 180px;

		display: grid;
		grid-template-columns: 2fr 1fr;
		grid-template-rows: 3rem 1fr 1fr;
		gap: 0.25rem;

		/* background: #191d24; */
	}
	.mobile-card {
		--tw-bg-opacity: 1;
		background-color: #191d24;
		--tw-text-opacity: 1;
		color: hsl(var(--nc) / var(--tw-text-opacity));
	}
</style>
