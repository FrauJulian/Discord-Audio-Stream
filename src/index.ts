export { default as AudioManager } from './audio-manager';
export { AudioManagerConfigError, AudioManagerError, AudioManagerStateError, FfmpegProcessError } from './errors';
export type {
    AudioManagerOptions,
    AudioSource,
    FfmpegMode,
    FfmpegOptions,
    PlaybackState,
    VoiceConnectionOptions,
    VolumeOptions,
} from './types';
