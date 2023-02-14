<script lang="ts">
	import { onMount } from 'svelte';
	import MediaQuery from '$lib/MediaQuery.svelte';

	const activeSentence = 'Thanks for visiting, please check out the links below.';
	let visible = false;
	onMount(() => {
		visible = true;
	});

	function typewriter(node: HTMLDivElement, { speed = 1 }: { speed: number }) {
		const valid = node.childNodes.length === 1 && node.childNodes[0].nodeType === Node.TEXT_NODE;

		if (!valid) {
			throw new Error(`This transition only works on elements with a single text node child`);
		}

		const text = node.textContent || 'Error';
		const duration = text.length / (speed * 0.01);
		console.log(duration);
		return {
			duration,
			tick: (t: number) => {
				const i = Math.trunc(text.length * t);
				node.textContent = text.slice(0, i);
			}
		};
	}
</script>

<MediaQuery query="(max-width: 499px)" let:matches>
	{#if matches}
		<img src="/junegoblin_big.png" class="w-32 mb-6" alt="" />
		<div class="w-full px-6 ">
			<div
				class="bubble-text w-full relative h-10 bubble-text mobile-card rounded-2xl drop-shadow-lg rounded-b-none px-2 py-2 mb-2 flex flex-row items-center justify-start "
			/>
		</div>
	{/if}
</MediaQuery>

<MediaQuery query="(min-width: 500px)" let:matches>
	{#if matches}
		<div id="speech-wrapper" class="chat chat-start mt-6 mb-2 pt-0 pb-0 drop-shadow-xl">
			<div id="speech-avatar" class="chat-image">
				<div class="w-10 rounded-full shadow-xl">
					<img alt="June's avatar" src="/junegoblin.png" />
				</div>
			</div>
			{#if visible}
				<div
					in:typewriter={{ speed: 4 }}
					id="speech-text"
					class="chat-bubble rounded-tl-none rounded-br-none max-w-[680px] overflow-ellipsis overflow-hidden text-md max-h-[2.5rem] min-h-[2.5rem]"
				>
					{activeSentence}
				</div>
			{/if}
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
