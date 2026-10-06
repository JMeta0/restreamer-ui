import * as M from './metadata';

const makeSource = () => ({
	type: 'network',
	inputs: [{ address: '', options: [] }],
	streams: [
		{ index: 0, stream: 0, type: 'video', codec: 'h264', width: 1280, height: 720, sampling_hz: 0, layout: '', channels: 0 },
		{ index: 0, stream: 1, type: 'audio', codec: 'aac', sampling_hz: 48000, layout: 'stereo', channels: 2 },
		{ index: 0, stream: 2, type: 'audio', codec: 'aac', sampling_hz: 48000, layout: 'stereo', channels: 2 },
	],
});

const makeProfile = (audioEncoders) => {
	const profile = M.initProfile({
		video: { source: 0, stream: 0 },
		audio: audioEncoders.map((_, i) => ({ source: 0, stream: i + 1 })),
	});

	profile.video.encoder = {
		coder: 'copy',
		settings: {},
		mapping: { global: [], local: ['-codec:v', 'copy'], filter: [] },
	};

	profile.audio.forEach((track, i) => {
		track.encoder = {
			coder: audioEncoders[i].coder,
			settings: {},
			mapping: { global: [], local: audioEncoders[i].local, filter: [] },
		};
	});

	return profile;
};

const optionsFor = (audioEncoders) => {
	const profile = makeProfile(audioEncoders);
	const [, , outputs] = M.createInputsOutputs([makeSource()], [profile], false);
	return outputs[0].options;
};

const COPY = { coder: 'copy', local: ['-codec:a', 'copy'] };

// Regression test for the stream-specifier bug: with more than one audio track
// each track must carry its own -codec:a:N / -b:a:N / -filter:a:N options,
// otherwise FFmpeg applies only the last track's settings to every audio
// stream.

test('single audio track keeps unspecifierized options', () => {
	expect(optionsFor([COPY])).toEqual(['-map', '0:0', '-codec:v', 'copy', '-map', '0:1', '-codec:a', 'copy']);
});

test('two copied audio tracks get per-stream specifiers', () => {
	expect(optionsFor([COPY, COPY])).toEqual([
		'-map',
		'0:0',
		'-codec:v',
		'copy',
		'-map',
		'0:1',
		'-codec:a:0',
		'copy',
		'-map',
		'0:2',
		'-codec:a:1',
		'copy',
	]);
});

test('mixed copy and encoded tracks keep their own settings', () => {
	const encoded = { coder: 'aac', local: ['-codec:a', 'aac', '-b:a', '64k', '-shortest'] };

	expect(optionsFor([COPY, encoded])).toEqual([
		'-map',
		'0:0',
		'-codec:v',
		'copy',
		'-map',
		'0:1',
		'-codec:a:0',
		'copy',
		'-map',
		'0:2',
		'-codec:a:1',
		'aac',
		'-b:a:1',
		'64k',
		'-shortest',
	]);
});

test('encoded tracks carry their own filter specifier', () => {
	const profile = makeProfile([COPY, { coder: 'aac', local: ['-codec:a', 'aac'] }]);

	profile.audio[1].filter = { graph: 'aresample=44100', settings: {} };

	const [, , outputs] = M.createInputsOutputs([makeSource()], [profile], false);

	expect(outputs[0].options).toContain('-filter:a:1');
	expect(outputs[0].options).not.toContain('-filter:a');
});

test('no audio track maps video only with -an', () => {
	const profile = makeProfile([]);
	profile.audio = [];

	const [, , outputs] = M.createInputsOutputs([makeSource()], [profile], false);

	expect(outputs[0].options).toContain('-an');
});
