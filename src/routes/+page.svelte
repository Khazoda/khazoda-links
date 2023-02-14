<script>
	import Cards from '$lib/Cards.svelte';
	import FooterBar from '$lib/FooterBar.svelte';
	import SpeechSequence from '$lib/SpeechSequence.svelte';
	import MediaQuery from '$lib/MediaQuery.svelte';
</script>

<main
	class="relative m-auto max-w-[680px] w-screen h-screen flex flex-col items-center pt-12 md:justify-center md:pt-0"
>
	<SpeechSequence />
	<Cards />
	<FooterBar />

	<!-- ToDo: Theme swapping & stripped down mobile reactivity, GitHub/Twitter?Insta? icons -->
</main>
