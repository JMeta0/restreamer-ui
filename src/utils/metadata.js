/*

Ingest Metadata Layout:

data = {
	version: "1.2.0",
	meta: {
		name: 'Livestream 1',
		description: 'Live from earth. Powered by datarhei/restreamer.',
		author: {
			name: '',
			description: '',
		},
	},
	license: '',
	player: {},
	sources: [{
		type: "network",
		settings: {
			mode: 'pull',
			address: 'https://ch-fra-n4.livespotting.com:443/vpu/rm1naghi/85pwd6iv.m3u8',
			udp: false,
		},
		inputs: [{
			address: 'https://ch-fra-n4.livespotting.com:443/vpu/rm1naghi/85pwd6iv.m3u8',
			options: ['-re'],
		}],
		streams: [{
			"url": "https://ch-fra-n4.livespotting.com:443/vpu/rm1naghi/85pwd6iv.m3u8",
			"format": "hls",
			"index": 0,
			"stream": 0,
			"type": "video",
			"codec": "h264",
			"coder": "h264",
			"bitrate_kbps": 0,
			"fps": 0,
			"pix_fmt": "yuvj420p",
			"width": 320,
			"height": 180,
			"sampling_hz": 0,
			"layout": "",
			"channels": 0
		},{
			"url": "https://ch-fra-n4.livespotting.com:443/vpu/rm1naghi/85pwd6iv.m3u8",
			"format": "hls",
			"index": 0,
			"stream": 1,
			"type": "video",
			"codec": "h264",
			"coder": "h264",
			"bitrate_kbps": 0,
			"fps": 0,
			"pix_fmt": "yuvj420p",
			"width": 1280,
			"height": 720,
			"sampling_hz": 0,
			"layout": "",
			"channels": 0
		}],
	},{
		type: "virtualaudio",
		settings: {...},
		inputs: [{
			address: 'anullsrc=r=44100:cl=stereo',
			options: [
				'-f', 'lavfi',
			],
		}],
		streams: [{
			"url": "anullsrc=r=44100:cl=stereo",
			"format": "lavfi",
			"index": 0, <-- this is the index of the "inputs" array
			"stream": 0, <-- this will be used for the -map parameter
			"type": "audio",
			"codec": "pcm_u8",
			"coder": "pcm_u8",
			"bitrate_kbps": 705,
			"sampling_hz": 44100,
			"layout": "stereo",
			"channels": 2
		}]
	}],
	profiles: [{
		audio: [{
			source: 1, <-- this is the index of the "sources" array
			stream: 0, <-- this is the index of the "streams" array in the referenced source
			encoder: {
				coder: 'aac',
				codec: 'aac',
				settings: {
					bitrate: '64',
					channels: '2',
					sampling: '44100'
				},
				mapping: {
					global: [],
					local: [
						'-codec:a', 'aac',
						'-b:a', '64k',
						'-bsf:a', 'aac_adtstoasc',
						'-shortest'
					]
				}
			},
			decoder: null,
			filter: {
				graph: 'aresample=osr=44100:ocl=stereo',
				settings: {
					aresample: {
						graph: 'aresample=osr=44100:ocl=stereo',
						settings: {
							channels: 2,
							layout: 'stereo',
							sampling: 44100
						}
					}
				}
			},
		}], <-- ordered list of audio tracks since 1.15.0: the position defines
		        the output audio track order (e.g. Twitch: 1st = live, 2nd = VOD
		        audio). Each track selects a source stream and has its own
		        encoder/decoder/filter. An empty list means "no audio".
		video: {
			source: 0,
			stream: 1,
			encoder: {
				coder: 'copy',
				codec: 'h264',
				settings: {},
				mapping: {
					global: [],
					local: [
						'-codec:v', 'copy',
					]
				}
			},
			decoder: null,
			filter: null,
		},
		"or": {},
		"video": {
			source: 0,
			stream: 1,
			encoder: {
				coder: 'libx264',
				codec: 'h264',
				settings: {
					preset: 'ultrafast',
					bitrate: '4096',
					fps: '25',
					profile: 'auto',
					tune: 'zerolatency',
				},
				mapping: {
					global: [],
					local: [
						'-codec:v', 'libx264',
						'-preset:v', 'ultrafast',
						'-b:v', '4096k',
						'-maxrate', '4096k',
						'-bufsize', '4096k',
						'-r', '25',
						'-g', '50',
						'-pix_fmt', 'yuv420p',
						'-profile:v', 'high',
						'-tune:v', 'zerolatency',
					]
				}
			},
			decoder: {
				coder: 'h264_cuvid',
				settings: {},
				mapping: [
					'-c:v h264_cuvid'
				]
			}
		}
	}],
	streams: [
		{
			index: 0,
			stream: 0,
			type: 'video',
			codec: 'h264',
			width: 1920,
			height: 1080,
			sampling_hz: 0,
			layout: '',
			channels: 0,
		},
		{
			index: 0,
			stream: 1,
			type: 'audio',
			codec: 'aac',
			width: 0,
			height: 0,
			sampling_hz: 44100,
			layout: 'stereo',
			channels: 2,
		}
	],
	control: {
		hls: {
			segmentDuration: 2,
			listSize: 6,
		},
		process: {
			autostart: true,
			reconnect: true,
			delay: 15,
			staleTimeout: 30
		},
		snapshot: {
			enable: true,
			interval: 60,
		},
	},
};

Egress Metadata Layout:

data = {
	version: "1.2.0",
	name: "foobar",
	control: {
		process: {
			autostart: true,
			reconnect: true,
			delay: 15,
			staleTimeout: 30
		},
	},
	output: {
		address: "rtmp://...",
		options: [],
	},
	settings: {
		...
	},
};

*/

import SemverGt from 'semver/functions/gt';
import SemverCompare from 'semver/functions/compare';

import * as Coders from '../misc/coders/Encoders';
import * as Filters from '../misc/filters';
import * as version from '../version';

const defaultMetadata = {
	version: version.Version,
	playersite: {},
	bundle: {},
};

const defaultIngestMetadata = {
	version: version.Version,
	sources: [],
	profiles: [{}],
	streams: [],
	control: {
		hls: {
			lhls: false,
			segmentDuration: 2,
			listSize: 6,
			cleanup: true,
			version: 3,
			storage: 'memfs',
			master_playlist: true,
		},
		rtmp: {
			enable: false,
		},
		srt: {
			enable: false,
		},
		process: {
			autostart: true,
			reconnect: true,
			delay: 15,
			staleTimeout: 30,
			low_delay: false,
		},
		snapshot: {
			enable: true,
			interval: 60,
		},
		preview: {
			enable: false,
			video_encoder: 'libx264',
			audio_encoder: 'aac',
		},
		limits: {
			cpu_usage: 0,
			memory_mbytes: 0,
			waitfor_seconds: 5,
		},
	},
	player: {},
	meta: {
		name: '',
		description: '',
		author: {
			name: '',
			description: '',
		},
	},
	license: 'CC BY 4.0',
};

const defaultEgressMetadata = {
	version: version.Version,
	name: '',
	control: {
		process: {
			autostart: false,
			reconnect: true,
			delay: 15,
			staleTimeout: 30,
		},
		source: {
			source: 'hls+memfs',
		},
		limits: {
			cpu_usage: 0,
			memory_mbytes: 0,
			waitfor_seconds: 5,
		},
	},
	outputs: [],
	settings: {},
	profiles: [{}],
	streams: [],
};

const getDefaultMetadata = () => {
	// poor mans deep copy
	return JSON.parse(JSON.stringify(defaultMetadata));
};

const getDefaultIngestMetadata = () => {
	// poor mans deep copy
	return JSON.parse(JSON.stringify(defaultIngestMetadata));
};

const getDefaultEgressMetadata = () => {
	// poor mans deep copy
	return JSON.parse(JSON.stringify(defaultEgressMetadata));
};

const initMetadata = (initialMetadata) => {
	return mergeMetadata(initialMetadata);
};

const transformers = {};

const mergeMetadata = (metadata, base) => {
	if (!metadata) {
		metadata = {};
	}

	const defaultMetadata = getDefaultMetadata();

	if (!base) {
		base = getDefaultMetadata();
	}

	metadata = {
		...base,
		...metadata,
	};

	metadata.playersite = {
		...base.playersite,
		...metadata.playersite,
	};

	metadata.bundle = {
		...base.bundle,
		...metadata.bundle,
	};

	metadata = transformMetadata(metadata, defaultMetadata.version, transformers);

	return metadata;
};

const initIngestMetadata = (initialMetadata) => {
	return mergeIngestMetadata(initialMetadata);
};

const audioTracksTransformer = (metadata) => {
	for (let p = 0; p < metadata.profiles.length; p++) {
		const profile = metadata.profiles[p];

		// profile.audio used to be a single audio entry. It is now an ordered
		// list of audio tracks (the order defines the output track order).
		if (!Array.isArray(profile.audio)) {
			const audio = {
				source: -1,
				stream: -1,
				encoder: {coder: 'none'},
				...profile.audio,
			};

			if (audio.source === -1 || audio.stream === -1 || audio.encoder.coder === 'none') {
				profile.audio = [];
			} else {
				profile.audio = [audio];
			}
		}
	}

	metadata.version = '1.15.0';

	return metadata;
};

const ingestTransformers = {
	'1.2.0': (metadata) => {
		for (let p = 0; p < metadata.profiles.length; p++) {
			const profile = metadata.profiles[p];

			for (const audio of profile.audio) {
				if (audio.encoder.coder === 'copy' || audio.encoder.coder === 'none') {
					continue;
				}

				const settings = audio.encoder.settings;

				audio.filter = {
					settings: {
						aresample: {
							settings: {
								channels: settings.channels,
								layout: settings.layout,
								sampling: settings.sampling,
							},
						},
					},
				};

				delete audio.encoder.settings.channels;
				delete audio.encoder.settings.layout;
				delete audio.encoder.settings.sampling;

				audio.filter.settings.aresample.graph = Filters.Audio.Get('aresample').createGraph(audio.filter.settings.aresample.settings);
				audio.filter.graph = audio.filter.settings.aresample.graph;
			}
		}

		metadata.version = '1.2.0';

		return metadata;
	},
	'1.15.0': audioTracksTransformer,
};

const mergeIngestMetadata = (metadata, base) => {
	if (!metadata) {
		metadata = {};
	}

	const defaultMetadata = getDefaultIngestMetadata();

	if (!base) {
		base = getDefaultIngestMetadata();
	}

	metadata = {
		...base,
		...metadata,
	};

	metadata.meta = {
		...base.meta,
		...metadata.meta,
	};

	metadata.meta.author = {
		...base.meta.author,
		...metadata.meta.author,
	};

	metadata.player = {
		...base.player,
		...metadata.player,
	};

	metadata.control = {
		...base.control,
		...metadata.control,
	};

	metadata.control.hls = {
		...base.control.hls,
		...metadata.control.hls,
	};

	metadata.control.process = {
		...base.control.process,
		...metadata.control.process,
	};

	metadata.control.snapshot = {
		...base.control.snapshot,
		...metadata.control.snapshot,
	};

	metadata.control.preview = {
		...base.control.preview,
		...metadata.control.preview,
	};

	if (!Array.isArray(metadata.sources)) {
		metadata.sources = [];
	} else {
		for (let i = 0; i < metadata.sources.length; i++) {
			metadata.sources[i] = initSource(metadata.sources[i].type, metadata.sources[i]);
		}
	}

	if (!Array.isArray(metadata.profiles)) {
		metadata.profiles = [initProfile({})];
	} else {
		for (let i = 0; i < metadata.profiles.length; i++) {
			metadata.profiles[i] = initProfile(metadata.profiles[i]);
		}
	}

	if (!Array.isArray(metadata.streams)) {
		metadata.streams = [];
	} else {
		for (let i = 0; i < metadata.streams.length; i++) {
			metadata.streams[i] = initStream(metadata.streams[i]);
		}
	}

	metadata = transformMetadata(metadata, defaultMetadata.version, ingestTransformers);

	return metadata;
};

const initEgressMetadata = (initialMetadata) => {
	return mergeEgressMetadata(initialMetadata);
};

const egressTransformers = {
	'1.15.0': audioTracksTransformer,
};

const mergeEgressMetadata = (metadata, base) => {
	if (!metadata) {
		metadata = {};
	}

	const defaultMetadata = getDefaultEgressMetadata();

	if (!base) {
		base = getDefaultEgressMetadata();
	}

	metadata = {
		...base,
		...metadata,
	};

	metadata.control = {
		...base.control,
		...metadata.control,
	};

	metadata.control.process = {
		...base.control.process,
		...metadata.control.process,
	};

	metadata.control.source = {
		...base.control.source,
		...metadata.control.source,
	};

	if (!Array.isArray(metadata.outputs)) {
		metadata.outputs = [];
	} else {
		for (let i = 0; i < metadata.outputs.length; i++) {
			metadata.outputs[i] = initOutput(metadata.outputs[i]);
		}
	}

	if (!Array.isArray(metadata.profiles)) {
		metadata.profiles = [initProfile({})];
	} else {
		for (let i = 0; i < metadata.profiles.length; i++) {
			metadata.profiles[i] = initProfile(metadata.profiles[i]);
		}
	}

	if (!Array.isArray(metadata.streams)) {
		metadata.streams = [];
	} else {
		for (let i = 0; i < metadata.streams.length; i++) {
			metadata.streams[i] = initStream(metadata.streams[i]);
		}
	}

	metadata = transformMetadata(metadata, defaultMetadata.version, egressTransformers);

	return metadata;
};

const validateProfile = (sources, profile, requireVideo = true) => {
	let validVideo = false;

	profile = initProfile(profile);

	if (profile.video.source !== -1 && profile.video.source < sources.length) {
		const source = sources[profile.video.source];

		if (profile.video.stream !== -1 && profile.video.stream < source.streams.length) {
			const stream = source.streams[profile.video.stream];

			if (stream.index < source.inputs.length) {
				if (stream.type === 'video') {
					validVideo = true;
				}
			}
		}
	}

	if (validVideo === false) {
		profile.video.source = -1;
		profile.video.stream = -1;
	}

	// Drop audio tracks that reference a source or stream that no longer exists.
	const validAudioTracks = [];

	for (const track of profile.audio) {
		if (track.source !== -1 && track.source < sources.length) {
			const source = sources[track.source];

			if (track.stream !== -1 && track.stream < source.streams.length) {
				const stream = source.streams[track.stream];

				if (stream.index < source.inputs.length && stream.type === 'audio') {
					validAudioTracks.push(track);
					continue;
				}
			}
		}

		track.source = -1;
		track.stream = -1;
	}

	profile.audio = validAudioTracks;

	let complete = true;

	if (requireVideo === true) {
		if (profile.video.encoder.coder === 'none' || profile.video.source === -1 || profile.video.stream === -1) {
			complete = false;
		}
	}

	return complete;
};

/**
 * specifierizeAudioOptions appends the output stream index to all audio
 * stream specifier options (-codec:a -> -codec:a:0, -filter:a -> -filter:a:1,
 * ...) so that multiple audio tracks can carry their own encoder settings.
 * Options without an audio specifier are left untouched.
 *
 * @param {*} options FFmpeg options of one audio track
 * @param {*} index Audio track index within the output
 * @returns The options with stream specifiers
 */
const specifierizeAudioOptions = (options, index) => {
	return options.map((o) => {
		// Only option names carry a stream specifier (e.g. -codec:a, -b:a,
		// -filter:a). Values never match this pattern.
		if (typeof o === 'string' && /^-[^:]*:a$/.test(o)) {
			return o + ':' + index;
		}

		return o;
	});
};

const createInputsOutputs = (sources, profiles, requireVideo = true) => {
	const source2inputMap = new Map();

	let global = [];
	const inputs = [];
	const outputs = [];

	// https://stackoverflow.com/questions/9229645/remove-duplicate-values-from-js-array
	const uniqBy = (a, key) => {
		return [...new Map(a.map((x) => [key(x), x])).values()];
	};

	const isActiveAudioTrack = (track) => {
		return track.encoder.coder !== 'none' && track.source !== -1 && track.stream !== -1;
	};

	// For each profile get the source and do the proper mapping
	for (let profile of profiles) {
		const complete = validateProfile(sources, profile, requireVideo);
		if (complete === false) {
			continue;
		}

		let index = -1;

		global = [...global, ...profile.video.decoder.mapping.global];

		const source = sources[profile.video.source];
		const stream = source.streams[profile.video.stream];
		const input = source.inputs[stream.index];

		input.options = [...profile.video.decoder.mapping.local, ...input.options];

		const id = profile.video.source + ':' + stream.index;

		// Check if we already use this input. If not, add it to the final inputs and
		// keep track of the mapping index.
		if (source2inputMap.has(id) === false) {
			const i = inputs.push(input);
			source2inputMap.set(id, i - 1);
		}

		index = source2inputMap.get(id);

		global = [...global, ...profile.video.encoder.mapping.global];

		const local = profile.video.encoder.mapping.local.slice();

		if (profile.video.encoder.coder !== 'copy' && (profile.video.filter.graph.length !== 0 || profile.video.encoder.mapping.filter.length !== 0)) {
			let filter = profile.video.filter.graph;
			if (profile.video.encoder.mapping.filter.length !== 0) {
				if (filter.length !== 0) {
					filter += ',';
				}

				filter += profile.video.encoder.mapping.filter.join(',');
			}

			local.unshift('-filter:v', filter);
		}

		const options = ['-map', index + ':' + stream.stream, ...local];

		// Each selected audio track becomes one audio stream of the output. The
		// order of the tracks is the order of the output audio tracks.
		const audioTracks = profile.audio.filter(isActiveAudioTrack);

		for (let t = 0; t < audioTracks.length; t++) {
			const track = audioTracks[t];

			global = [...global, ...track.decoder.mapping.global];

			const source = sources[track.source];
			const stream = source.streams[track.stream];

			if (stream === undefined || stream.index >= source.inputs.length) {
				continue;
			}

			const input = source.inputs[stream.index];

			input.options = [...track.decoder.mapping.local, ...input.options];

			const id = track.source + ':' + stream.index;

			if (source2inputMap.has(id) === false) {
				const i = inputs.push(input);
				source2inputMap.set(id, i - 1);
			}

			index = source2inputMap.get(id);

			global = [...global, ...track.encoder.mapping.global];

			let local = track.encoder.mapping.local.slice();

			if (track.encoder.coder !== 'copy' && (track.filter.graph.length !== 0 || track.encoder.mapping.filter.length !== 0)) {
				let filter = track.filter.graph;
				if (track.encoder.mapping.filter.length !== 0) {
					if (filter.length !== 0) {
						filter += ',';
					}

					filter += track.encoder.mapping.filter.join(',');
				}

				local.unshift('-filter:a', filter);
			}

			if (audioTracks.length > 1) {
				local = specifierizeAudioOptions(local, t);
			}

			options.push('-map', index + ':' + stream.stream, ...local);
		}

		if (audioTracks.length === 0) {
			options.push('-an');
		}

		outputs.push({
			address: '',
			options: options,
		});
	}

	// global is an array of arrays. Here we remove duplicates and flatten it.
	global = uniqBy(global, (x) => JSON.stringify(x.sort()));
	global = global.reduce((acc, val) => acc.concat(val), []);

	return [global, inputs, outputs];
};

const createOutputStreams = (sources, profiles, requireVideo = true) => {
	const streams = [];

	// Generate a list of output streams from the profiles
	for (let profile of profiles) {
		const complete = validateProfile(sources, profile, requireVideo);
		if (complete === false) {
			continue;
		}

		if (profile.video.encoder.coder !== 'none' && profile.video.source !== -1 && profile.video.stream !== -1) {
			const source = sources[profile.video.source];
			const stream = source.streams[profile.video.stream];

			const s = initStream({
				index: 0,
				stream: streams.length,
				type: stream.type,
				width: stream.width,
				height: stream.height,
			});

			if (profile.video.encoder.coder !== 'copy') {
				const encoder = Coders.Video.Get(profile.video.encoder.coder);
				if (encoder) {
					s.codec = encoder.codec;
				}
			} else {
				s.codec = stream.codec;
			}

			streams.push(s);
		}

		for (const track of profile.audio) {
			if (track.encoder.coder === 'none' || track.source === -1 || track.stream === -1) {
				continue;
			}

			const source = sources[track.source];
			const stream = source.streams[track.stream];

			if (stream === undefined) {
				continue;
			}

			const s = initStream({
				index: 0,
				stream: streams.length,
				type: stream.type,
				sampling_hz: stream.sampling_hz,
				layout: stream.layout,
				channels: stream.channels,
			});

			if (track.encoder.coder !== 'copy') {
				const encoder = Coders.Audio.Get(track.encoder.coder);
				if (encoder) {
					s.codec = encoder.codec;
				}
			} else {
				s.codec = stream.codec;
			}

			streams.push(s);
		}
	}

	return streams;
};

const initSource = (type, initialSource) => {
	if (!initialSource) {
		initialSource = {};
	}

	let source = {
		type: '',
		settings: {},
		inputs: [],
		streams: [],
	};

	source = {
		...source,
		...initialSource,
	};

	return source;
};

/**
 * initAudioTrack normalizes a single audio track of a profile. Each track
 * selects one source stream ({source, stream}) and defines its own
 * encoder/decoder/filter.
 */
const initAudioTrack = (initialTrack) => {
	if (!initialTrack) {
		initialTrack = {};
	}

	const track = {
		source: -1,
		stream: -1,
		encoder: {},
		decoder: {},
		filter: {},
		...initialTrack,
	};

	track.encoder = {
		coder: 'none',
		settings: {},
		mapping: {},
		...track.encoder,
	};

	// mapping used to be an array for input/output specific options
	if (Array.isArray(track.encoder.mapping)) {
		track.encoder.mapping = {
			global: [],
			local: track.encoder.mapping,
			filter: [],
		};
	} else {
		track.encoder.mapping = {
			global: [],
			local: [],
			filter: [],
			...track.encoder.mapping,
		};
	}

	track.decoder = {
		coder: 'default',
		settings: {},
		mapping: {},
		...track.decoder,
	};

	if (Array.isArray(track.decoder.mapping)) {
		track.decoder.mapping = {
			global: [],
			local: track.decoder.mapping,
			filter: [],
		};
	} else {
		track.decoder.mapping = {
			global: [],
			local: [],
			filter: [],
			...track.decoder.mapping,
		};
	}

	track.filter = {
		graph: '',
		settings: {},
		...track.filter,
	};

	return track;
};

const initProfile = (initialProfile) => {
	if (!initialProfile) {
		initialProfile = {};
	}

	const profile = {
		video: {},
		audio: {},
		...initialProfile,
	};

	profile.video = {
		source: -1,
		stream: -1,
		encoder: {},
		decoder: {},
		filter: {},
		...profile.video,
	};

	profile.video.encoder = {
		coder: 'none',
		settings: {},
		mapping: {},
		...profile.video.encoder,
	};

	// mapping used to be an array for input/output specific options
	if (Array.isArray(profile.video.encoder.mapping)) {
		profile.video.encoder.mapping = {
			global: [],
			local: profile.video.encoder.mapping,
			filter: [],
		};
	} else {
		profile.video.encoder.mapping = {
			global: [],
			local: [],
			filter: [],
			...profile.video.encoder.mapping,
		};
	}

	profile.video.decoder = {
		coder: 'default',
		settings: {},
		mapping: {},
		...profile.video.decoder,
	};

	if (Array.isArray(profile.video.decoder.mapping)) {
		profile.video.decoder.mapping = {
			global: [],
			local: profile.video.decoder.mapping,
			filter: [],
		};
	} else {
		profile.video.decoder.mapping = {
			global: [],
			local: [],
			filter: [],
			...profile.video.decoder.mapping,
		};
	}

	profile.video.filter = {
		graph: '',
		settings: {},
		...profile.video.filter,
	};

	// profile.audio is an ordered list of audio tracks since 1.15.0. The
	// position of a track in the list defines the output audio track order.
	// A single (legacy) audio entry is wrapped into a one-element list. An
	// empty list means "no audio".
	const rawAudio = Array.isArray(initialProfile.audio)
		? initialProfile.audio[0] !== undefined
			? initialProfile.audio[0]
			: {}
		: initialProfile.audio !== undefined && initialProfile.audio !== null
			? initialProfile.audio
			: {};

	if (Array.isArray(profile.audio)) {
		profile.audio = profile.audio.map((track) => initAudioTrack(track));
	} else {
		const audio = initAudioTrack(profile.audio);

		if (audio.source === -1 || audio.stream === -1 || audio.encoder.coder === 'none') {
			profile.audio = [];
		} else {
			profile.audio = [audio];
		}
	}

	profile.custom = {
		selected: rawAudio.source === 1,
		stream: rawAudio.source === 1 ? -2 : rawAudio.stream !== undefined ? rawAudio.stream : -1,
		...profile.custom,
	};

	return profile;
};

const initStream = (initialStream) => {
	if (!initialStream) {
		initialStream = {};
	}

	const stream = {
		url: '',
		index: 0,
		stream: 0,
		type: '',
		codec: '',
		width: 0,
		height: 0,
		pix_fmt: '',
		sampling_hz: 0,
		layout: '',
		channels: 0,
		...initialStream,
	};

	return stream;
};

const initOutput = (initialOutput) => {
	if (!initialOutput) {
		initialOutput = {};
	}

	const output = {
		address: '',
		options: [],
		...initialOutput,
	};

	return output;
};

const analyzeStreams = (type, streams) => {
	let video = null;
	let audio = null;

	for (let stream of streams) {
		if (stream.type === 'video') {
			if (video === null) {
				video = stream;
				continue;
			}
		} else if (stream.type === 'audio') {
			if (audio === null) {
				audio = stream;
				continue;
			}
		}

		if (video !== null && audio !== null) {
			break;
		}
	}

	let status = 'success';

	if (video === null && audio === null) {
		status = 'error';
	} else if (type === 'video' && video === null) {
		status = 'nostream';
	} else if (type === 'audio' && audio === null) {
		status = 'nostream';
	}

	return status;
};

/**
 * Preselect a profile based on the available streams and encoders.
 *
 * @param {*} type Either 'video' or 'audio'
 * @param {*} streams Array of streams
 * @param {*} profile A profile
 * @param {*} encoders Array of supported (by ffmpeg) encoders
 * @param {*} preselectAudio Whether to preselect an audio profile if type == video
 * @returns A profile
 */
const preselectProfile = (type, streams, profile, encoders, preselectAudio = true) => {
	const makeAudioTrack = (streams, index) => {
		const audio = initAudioTrack({});
		audio.stream = index;

		if (streams[index].codec === 'aac' || streams[index].codec === 'mp3') {
			audio.encoder.coder = 'copy';
		} else {
			let coder = Coders.Audio.GetCoderForCodec('aac', encoders.audio);
			if (coder === null) {
				coder = Coders.Audio.GetCoderForCodec('mp3', encoders.audio);
				if (coder === null) {
					audio.encoder.coder = 'none';
				} else {
					audio.encoder.coder = coder.coder;
				}
			} else {
				audio.encoder.coder = coder.coder;
			}
		}

		return audio;
	};

	// Every audio stream of the source becomes one audio track.
	const preselectAudioTracks = (streams) => {
		const tracks = [];

		for (let i = 0; i < streams.length; i++) {
			if (streams[i].type !== 'audio') {
				continue;
			}

			tracks.push(makeAudioTrack(streams, i));
		}

		return tracks;
	};

	const isVideoPlausible = (streams, video) => {
		if (video.stream < 0) {
			return false;
		}

		if (video.stream >= streams.length) {
			return false;
		}

		if (streams[video.stream].type !== 'video') {
			return false;
		}

		if (streams[video.stream].codec !== 'h264') {
			if (video.encoder.coder === 'copy') {
				return false;
			}
		} else {
			if (video.encoder.coder === 'copy') {
				return true;
			}
		}

		const coder = Coders.Video.Get(video.encoder.coder);
		if (coder === null) {
			return false;
		}

		if (coder.codec !== 'h264') {
			return false;
		}

		return true;
	};

	const isAudioPlausible = (streams, tracks) => {
		if (!Array.isArray(tracks) || tracks.length === 0) {
			return false;
		}

		for (const audio of tracks) {
			if (audio.stream < 0) {
				return false;
			}

			if (audio.stream >= streams.length) {
				return false;
			}

			if (streams[audio.stream].type !== 'audio') {
				return false;
			}

			if (streams[audio.stream].codec !== 'aac' && streams[audio.stream].codec !== 'mp3') {
				if (audio.encoder.coder === 'copy') {
					return false;
				}
			} else {
				if (audio.encoder.coder === 'copy') {
					continue;
				}
			}

			const coder = Coders.Audio.Get(audio.encoder.coder);
			if (coder === null) {
				return false;
			}

			if (coder.codec !== 'aac' && coder.codec !== 'mp3') {
				return false;
			}
		}

		return true;
	};

	if (type === 'video') {
		if (isVideoPlausible(streams, profile.video) === false) {
			const video = profile.video;

			video.stream = -1;
			video.encoder.coder = 'none';

			for (let i = 0; i < streams.length; i++) {
				if (streams[i].type !== 'video') {
					continue;
				}

				video.source = 0;
				video.stream = i;

				if (streams[i].codec === 'h264') {
					video.encoder.coder = 'copy';
				} else {
					let coder = Coders.Video.GetCoderForCodec('h264', encoders.video);
					if (coder === null) {
						video.encoder.coder = 'none';
					} else {
						video.encoder.coder = coder.coder;
					}
				}

				break;
			}

			profile.video = video;
		}

		// Only select audio stream if explicitely asked to.
		if (preselectAudio === true) {
			if (isAudioPlausible(streams, profile.audio) === false) {
				profile.audio = preselectAudioTracks(streams);

				if (profile.audio.length !== 0) {
					profile.custom.selected = false;
					profile.custom.stream = profile.audio[0].stream;
				} else {
					profile.custom.selected = false;
					profile.custom.stream = -1;
				}
			}
		}
	} else if (type === 'audio') {
		if (isAudioPlausible(streams, profile.audio) === false) {
			profile.audio = preselectAudioTracks(streams);
		}

		for (const audio of profile.audio) {
			audio.source = 1;
		}
	}

	return profile;
};

const cleanupSources = (sources) => {
	return [sources.video, sources.audio];
};

const cleanupProfile = (profile) => {
	profile.video.source = 0;

	for (const audio of profile.audio) {
		audio.source = 0;

		if (profile.custom.selected === true) {
			audio.source = 1;
		}

		if (audio.stream === -1) {
			audio.source = -1;
		}
	}

	// Drop tracks without a stream
	profile.audio = profile.audio.filter((audio) => audio.stream !== -1);

	if (profile.video.stream === -1) {
		profile.video.source = -1;
	}

	return {
		audio: profile.audio,
		video: profile.video,
		custom: profile.custom,
	};
};

const transformMetadata = (metadata, targetVersion, transformers) => {
	if (metadata.version === 1) {
		metadata.version = '1.0.0';
	}

	if (targetVersion === 1) {
		targetVersion = '1.0.0';
	}

	if (metadata.version === targetVersion) {
		return metadata;
	}

	// Create a list of all transformers that are greater than the current version
	// and sort them in ascending order.
	const tlist = [];

	for (let v in transformers) {
		if (SemverGt(v, metadata.version)) {
			tlist.push(v);
		}
	}

	tlist.sort(SemverCompare);

	// Apply all found transformers
	for (let t of tlist) {
		metadata = transformers[t](metadata);
	}

	// Stamp the final, requested version. Transformers may set an intermediate
	// version; the metadata must end up at the target after all of them ran.
	metadata.version = targetVersion;

	return metadata;
};

export {
	getDefaultMetadata,
	getDefaultIngestMetadata,
	getDefaultEgressMetadata,
	initMetadata,
	initIngestMetadata,
	initEgressMetadata,
	mergeMetadata,
	mergeIngestMetadata,
	mergeEgressMetadata,
	validateProfile,
	createInputsOutputs,
	createOutputStreams,
	initSource,
	initProfile,
	initAudioTrack,
	analyzeStreams,
	preselectProfile,
	cleanupProfile,
	cleanupSources,
};
