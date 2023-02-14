<script>
	import Card from '$lib/Card.svelte';
	import MediaQuery from '$lib/MediaQuery.svelte';
</script>

<MediaQuery query="(max-width: 499px)" let:matches>
	{#if matches}
		<div class="flex flex-col justify-center gap-2 w-full px-6">
			<Card
				siteName="Personal Site"
				siteHref="https://www.junefaleiro.com/"
				siteWingding="/personal_site.svg"
				siteDescription="Browse my previous work and personal projects"
			/>
			<Card
				siteName="SeaCroak"
				siteHref="https://www.seacroak.com/"
				siteWingding="/seacroak.svg"
				siteDescription="Explore the applications, games and projects I've released under the SeaCroak brand"
			/>
			<Card
				siteName="Modrinth"
				siteHref="https://modrinth.com/user/khazoda"
				siteWingding="/modrinth.svg"
				siteDescription="Repository of my mods on Modrinth"
			/>
			<Card
				siteName="CurseForge"
				siteHref="https://www.curseforge.com/members/khazoda/projects"
				siteWingding="/curseforge.svg"
				siteDescription="Repository of my mods on CurseForge"
			/>
		</div>
	{/if}
</MediaQuery>

<MediaQuery query="(min-width: 500px)" let:matches>
	{#if matches}
		<div class="flex flex-col justify-center gap-1">
			<Card
				siteName="Personal Site"
				siteHref="https://www.junefaleiro.com/"
				siteWingding="/personal_site.svg"
				siteDescription="Browse my previous work and personal projects"
			/>
			<Card
				siteName="SeaCroak"
				siteHref="https://www.seacroak.com/"
				siteWingding="/seacroak.svg"
				siteDescription="Explore the applications, games and projects I've released under the SeaCroak brand"
			/>
			<Card
				siteName="Modrinth"
				siteHref="https://modrinth.com/user/khazoda"
				siteWingding="/modrinth.svg"
				siteDescription="Repository of my mods on Modrinth"
			/>
			<Card
				siteName="CurseForge"
				siteHref="https://www.curseforge.com/members/khazoda/projects"
				siteWingding="/curseforge.svg"
				siteDescription="Repository of my mods on CurseForge"
			/>
		</div>
	{/if}
</MediaQuery>
