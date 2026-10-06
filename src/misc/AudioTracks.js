import React from 'react';

import { useLingui } from '@lingui/react';
import { Trans, t } from '@lingui/macro';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import CloseIcon from '@mui/icons-material/Close';
import WarningIcon from '@mui/icons-material/Warning';

import BoxText from './BoxText';
import EncodingSelect from './EncodingSelect';
import FilterSelect from './FilterSelect';
import StreamSelect from '../views/Edit/StreamSelect';
import { newAudioTrack, selectTrackEncoder } from '../views/Publication/helper';

export default function AudioTracks(props) {
	const { i18n } = useLingui();
	const tracks = Array.isArray(props.tracks) ? props.tracks : [];

	const emit = (next) => {
		props.onChange(next);
	};

	const handleStreamChange = (index) => (stream) => {
		const next = [...tracks];
		const track = {...next[index]};

		selectTrackEncoder(track, 'audio', props.streams, stream, props.codecs, props.skills);
		track.filter = {
			graph: '',
			settings: {},
		};

		next[index] = track;
		emit(next);
	};

	const handleEncodingChange = (index) => (encoder, decoder) => {
		const next = [...tracks];
		next[index] = {
			...next[index],
			encoder: encoder,
			decoder: decoder,
		};
		emit(next);
	};

	const handleFilterChange = (index) => (filter) => {
		const next = [...tracks];
		next[index] = {
			...next[index],
			filter: filter,
		};
		emit(next);
	};

	const handleAdd = () => {
		const track = newAudioTrack(tracks, props.streams, props.codecs, props.skills);

		if (track === null) {
			return;
		}

		emit([...tracks, track]);
	};

	const handleRemove = (index) => () => {
		emit(tracks.filter((t, i) => i !== index));
	};

	const handleMove = (index, delta) => () => {
		const target = index + delta;

		if (target < 0 || target >= tracks.length) {
			return;
		}

		const next = [...tracks];
		const track = next[index];
		next[index] = next[target];
		next[target] = track;
		emit(next);
	};

	const messageText = (id) => {
		switch (id) {
			case 'audio-tracks-max':
				return i18n._(t`This service supports only one audio track. Additional tracks are ignored.`);
			case 'audio-tracks-flv-ffmpeg':
				return i18n._(t`Multiple audio tracks for FLV-based outputs require FFmpeg 8 or newer.`);
			case 'audio-tracks-flv-legacy':
				return i18n._(t`Most players (and legacy RTMP/FLV endpoints) only play the first audio track. Additional tracks are e.g. used by Twitch for the VOD audio.`);
			case 'audio-tracks-duplicate':
				return i18n._(t`This audio stream is already used by another track.`);
			default:
				return id;
		}
	};

	const warnings = [];

	for (const message of props.warnings) {
		if (message.level === 'error') {
			warnings.push(
				<Grid item xs={12} key={message.id}>
					<BoxText>
						<Typography variant="body2" gutterBottom>
							<WarningIcon fontSize="small" /> {messageText(message.id)}
						</Typography>
					</BoxText>
				</Grid>,
			);
		} else {
			warnings.push(
				<Grid item xs={12} key={message.id}>
					<Typography variant="caption">{messageText(message.id)}</Typography>
				</Grid>,
			);
		}
	}

	const trackList = [];

	for (let i = 0; i < tracks.length; i++) {
		const track = tracks[i];

		trackList.push(
			<Grid item xs={12} key={i}>
				<Grid container spacing={2}>
					<Grid item xs={12}>
						<Grid container spacing={1} alignItems="center">
							<Grid item xs>
								<Typography variant="h5">
									<Trans>Track {i + 1}</Trans>
								</Typography>
							</Grid>
							<Grid item>
								<IconButton
									size="small"
									aria-label={i18n._(t`Move audio track up`)}
									title={i18n._(t`Move audio track up`)}
									disabled={i === 0}
									onClick={handleMove(i, -1)}
								>
									<ArrowUpwardIcon fontSize="small" />
								</IconButton>
								<IconButton
									size="small"
									aria-label={i18n._(t`Move audio track down`)}
									title={i18n._(t`Move audio track down`)}
									disabled={i === tracks.length - 1}
									onClick={handleMove(i, 1)}
								>
									<ArrowDownwardIcon fontSize="small" />
								</IconButton>
								<IconButton size="small" aria-label={i18n._(t`Remove audio track`)} title={i18n._(t`Remove audio track`)} onClick={handleRemove(i)}>
									<CloseIcon fontSize="small" />
								</IconButton>
							</Grid>
						</Grid>
					</Grid>
					<Grid item xs={12}>
						<StreamSelect type="audio" streams={props.streams} selected={track.stream} onChange={handleStreamChange(i)} />
					</Grid>
					<Grid item xs={12}>
						<EncodingSelect type="audio" streams={props.streams} profile={track} codecs={props.codecs} skills={props.skills} onChange={handleEncodingChange(i)} />
					</Grid>
					{props.showFilters === true && track.encoder.coder !== 'copy' && track.encoder.coder !== 'none' && (
						<Grid item xs={12}>
							<FilterSelect type="audio" profile={track} availableFilters={props.skills.filter} onChange={handleFilterChange(i)} />
						</Grid>
					)}
				</Grid>
			</Grid>,
		);
	}

	const maxTracks = props.maxTracks > 0 ? props.maxTracks : 0;

	return (
		<Grid container spacing={2}>
			{tracks.length === 0 && (
				<Grid item xs={12}>
					<Typography variant="subheading">
						<Trans>No audio track selected. The publication will be sent without audio.</Trans>
					</Typography>
				</Grid>
			)}
			{trackList}
			{tracks.length > 1 && (
				<Grid item xs={12}>
					<Typography variant="caption">
						<Trans>The order of the tracks defines the order of the output audio tracks.</Trans>
					</Typography>
				</Grid>
			)}
			{warnings}
			<Grid item xs={12}>
				<Button variant="outlined" color="default" disabled={maxTracks > 0 && tracks.length >= maxTracks} onClick={handleAdd}>
					<Trans>Add audio track</Trans>
				</Button>
			</Grid>
		</Grid>
	);
}

AudioTracks.defaultProps = {
	streams: [],
	tracks: [],
	codecs: [],
	skills: {},
	maxTracks: 0,
	warnings: [],
	showFilters: true,
	onChange: function (tracks) {},
};
