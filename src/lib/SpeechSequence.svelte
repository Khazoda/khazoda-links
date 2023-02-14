<script lang="ts">
	import { onMount } from 'svelte';

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

<div id="speech-wrapper" class="chat chat-start mt-6 mb-2 pt-0 pb-0 drop-shadow-xl">
	<div id="speech-avatar" class="chat-image">
		<div class="w-10 rounded-full shadow-xl">
			<img alt="June's avatar" src="/junegoblin.png" />
		</div>
	</div>
	{#if visible}
		<div
			transition:typewriter={{ speed: 4 }}
			id="speech-text"
			class="chat-bubble rounded-tl-none rounded-br-none max-w-[680px] overflow-ellipsis overflow-hidden text-md max-h-[2.5rem] min-h-[2.5rem]"
		>
			{activeSentence}
		</div>
	{/if}
</div>
