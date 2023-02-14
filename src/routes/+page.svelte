<script>
	import Card from '$lib/Card.svelte';
	import { onMount } from 'svelte';

	let visible = false;
	onMount(() => (visible = true));
	/**
	 * @param {HTMLDivElement} node
	 */
	function typewriter(node, { speed = 1 }) {
		const valid = node.childNodes.length === 1 && node.childNodes[0].nodeType === Node.TEXT_NODE;

		if (!valid) {
			throw new Error(`This transition only works on elements with a single text node child`);
		}

		const text = node.textContent || 'Error';
		const duration = text.length / (speed * 0.01);

		return {
			duration,
			tick: (/** @type {number} */ t) => {
				const i = Math.trunc(text.length * t);
				node.textContent = text.slice(0, i);
			}
		};
	}
</script>

<main class="m-auto max-w-[680px] w-screen h-screen flex flex-col items-center justify-center">
	<div id="speech-wrapper" class="chat chat-start mt-6">
		<div id="speech-avatar" class="chat-image avatar">
			<div class="w-10 rounded-full">
				<img
					alt="June's avatar"
					src="https://yt3.ggpht.com/fL5t5DZL3yXCA3UIf88Ec6PwOUw749HXNdw2iUKNce-y2sg365bjlTLkSWbisX5B_Vmd4zufDoA=s88-c-k-c0x00ffffff-no-rj-mo"
				/>
			</div>
		</div>
		{#if visible}
			<div
				transition:typewriter={{ speed: 4 }}
				id="speech-text"
				class="chat-bubble min-h-[32px] max-w-[680px] overflow-ellipsis overflow-hidden"
			>
				Thanks for visiting, please check out the links below.
			</div>
		{/if}
	</div>

	<div class="flex flex-col justify-center gap-1">
		<Card
			siteName="Personal Site"
			siteWingding="/personal_site.svg"
			siteDescription="Browse my previous work and personal projects"
		/>
		<Card
			siteName="SeaCroak"
			siteWingding="/seacroak.svg"
			siteDescription="Explore the applications, games and projects I've released under the SeaCroak brand"
		/>
		<Card
			siteName="Modrinth"
			siteWingding="/modrinth.svg"
			siteDescription="Repository of my mods on Modrinth"
		/>
		<Card
			siteName="CurseForge"
			siteWingding="/curseforge.svg"
			siteDescription="Repository of my mods on CurseForge"
		/>
	</div>
</main>
