<script>
	import Card from '$lib/Card.svelte';
	import SpeechSequence from '$lib/SpeechSequence.svelte';
</script>

<main
	class="relative m-auto max-w-[680px] w-screen h-screen flex flex-col items-center justify-center"
>
	<SpeechSequence />
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
	ToDo: Theme swapping & stripped down mobile reactivity
</main>
