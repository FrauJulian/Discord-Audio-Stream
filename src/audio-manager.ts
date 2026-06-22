import type { AudioPlayer, AudioResource, VoiceConnection } from '@discordjs/voice';
import {
    createAudioPlayer,
    createAudioResource,
    entersState,
    joinVoiceChannel,
    NoSubscriberBehavior,
    StreamType,
    VoiceConnectionStatus,
} from '@discordjs/voice';
import { isAbsolute, resolve } from 'node:path';

import { AudioManagerConfigError, AudioManagerStateError } from './errors';
import { startFfmpeg, type FfmpegProcessHandle } from './ffmpeg';
import type {
    AudioManagerOptions,
    AudioSource,
    PlaybackState,
    ResolvedAudioSource,
    VoiceConnectionOptions,
} from './types';

const DEFAULT_CONNECT_TIMEOUT_MS = 20_000;
const DEFAULT_RENEW_INTERVAL_MS = 5_400_000;

export default class AudioManager {
    private readonly audioPlayer: AudioPlayer;

    private connection: VoiceConnection | undefined;
    private resource: AudioResource | undefined;
    private ffmpeg: FfmpegProcessHandle | undefined;
    private renewTimer: NodeJS.Timeout | undefined;
    private playbackState: PlaybackState = 'idle';
    private connectionOptions: VoiceConnectionOptions | undefined;
    private audioSource: AudioSource | undefined;
    private readonly options: Required<Pick<AudioManagerOptions, 'connectTimeoutMs'>> &
        Omit<AudioManagerOptions, 'connectTimeoutMs'>;

    public constructor(options: AudioManagerOptions = {}) {
        this.options = {
            ...options,
            connectTimeoutMs: options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS,
        };
        this.connectionOptions = options.connection;
        this.audioSource = options.source;
        this.audioPlayer = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Play,
            },
        });
    }

    public get state(): PlaybackState {
        return this.playbackState;
    }

    public get isPlaying(): boolean {
        return this.playbackState === 'playing';
    }

    public get isConnected(): boolean {
        return Boolean(this.connection);
    }

    public setConnection(options: VoiceConnectionOptions): void {
        this.assertNotDisposed();
        this.connectionOptions = options;
    }

    public setSource(source: AudioSource): void {
        this.assertNotDisposed();
        this.audioSource = source;
    }

    public async connect(): Promise<void> {
        this.assertNotDisposed();

        if (!this.connectionOptions) {
            throw new AudioManagerConfigError('Voice connection options are required before connecting.');
        }

        this.clearRenewTimer();
        this.playbackState = 'connecting';
        this.connection?.destroy();
        this.connection = joinVoiceChannel({
            guildId: this.connectionOptions.guildId,
            channelId: this.connectionOptions.channelId,
            adapterCreator: this.connectionOptions.adapterCreator,
        });
        this.connection.subscribe(this.audioPlayer);

        try {
            await entersState(this.connection, VoiceConnectionStatus.Ready, this.options.connectTimeoutMs);
        } catch (error) {
            this.connection.destroy();
            this.connection = undefined;
            this.playbackState = 'stopped';
            throw error;
        }
        this.playbackState = 'ready';
        this.scheduleRenewal();
    }

    public async play(source?: AudioSource): Promise<void> {
        this.assertNotDisposed();

        if (source) {
            this.setSource(source);
        }

        if (!this.connection) {
            throw new AudioManagerStateError('A voice connection is required before audio can be played.');
        }

        const resolvedSource = this.resolveSource();
        this.stopCurrentPlayback();
        this.ffmpeg = startFfmpeg(resolvedSource.input, this.options.ffmpeg);
        try {
            await this.ffmpeg.ready;
        } catch (error) {
            this.stopCurrentPlayback();
            throw error;
        }
        this.resource = createAudioResource(this.ffmpeg.process.stdout, {
            inputType: StreamType.Raw,
            inlineVolume: this.options.volume?.enabled === true,
        });

        if (this.options.volume?.enabled === true && this.options.volume.initialPercent !== undefined) {
            this.setVolume(this.options.volume.initialPercent);
        }

        this.audioPlayer.play(this.resource);
        this.playbackState = 'playing';
    }

    public async start(): Promise<void> {
        await this.connect();
        await this.play();
    }

    public pause(): void {
        this.assertNotDisposed();

        if (this.playbackState !== 'playing') {
            throw new AudioManagerStateError('Audio can only be paused while it is playing.');
        }

        this.audioPlayer.pause();
        this.playbackState = 'paused';
    }

    public resume(): void {
        this.assertNotDisposed();

        if (this.playbackState !== 'paused') {
            throw new AudioManagerStateError('Audio can only be resumed while it is paused.');
        }

        this.audioPlayer.unpause();
        this.playbackState = 'playing';
    }

    public async stop(): Promise<void> {
        if (this.playbackState === 'disposed') {
            return;
        }

        this.clearRenewTimer();
        this.stopCurrentPlayback();
        this.audioPlayer.stop(true);
        this.connection?.disconnect();
        this.connection?.destroy();
        this.connection = undefined;
        this.playbackState = 'stopped';
    }

    public setVolume(volumeInPercent: number): void {
        this.assertNotDisposed();

        if (this.options.volume?.enabled !== true) {
            throw new AudioManagerStateError('Volume control requires volume.enabled to be true.');
        }

        if (volumeInPercent < 0 || volumeInPercent > 100) {
            throw new AudioManagerConfigError('Volume must be between 0 and 100 percent.');
        }

        if (!this.resource?.volume) {
            throw new AudioManagerStateError('No audio resource with volume control is currently active.');
        }

        this.resource.volume.setVolume(volumeInPercent / 100);
    }

    public dispose(): void {
        if (this.playbackState === 'disposed') {
            return;
        }

        this.clearRenewTimer();
        this.stopCurrentPlayback();
        this.audioPlayer.stop(true);
        this.connection?.destroy();
        this.connection = undefined;
        this.connectionOptions = undefined;
        this.audioSource = undefined;
        this.playbackState = 'disposed';
    }

    private resolveSource(): ResolvedAudioSource {
        if (!this.audioSource) {
            throw new AudioManagerConfigError('Audio source is required before playback can start.');
        }

        if (this.audioSource.type === 'url') {
            try {
                return {
                    input: new URL(this.audioSource.url).toString(),
                    source: this.audioSource,
                };
            } catch (error) {
                throw new AudioManagerConfigError(`Invalid audio source URL. Cause: ${String(error)}`);
            }
        }

        return {
            input: isAbsolute(this.audioSource.path)
                ? this.audioSource.path
                : resolve(process.cwd(), this.audioSource.path),
            source: this.audioSource,
        };
    }

    private scheduleRenewal(): void {
        const renewIntervalMs = this.options.renewIntervalMs ?? DEFAULT_RENEW_INTERVAL_MS;

        if (renewIntervalMs === false) {
            return;
        }

        this.renewTimer = setTimeout(() => {
            void this.start().catch(() => {
                this.clearRenewTimer();
                this.stopCurrentPlayback();
                this.audioPlayer.stop(true);
                this.connection?.disconnect();
                this.connection?.destroy();
                this.connection = undefined;
                this.playbackState = 'stopped';
            });
        }, renewIntervalMs);

        if (typeof this.renewTimer.unref === 'function') {
            this.renewTimer.unref();
        }
    }

    private clearRenewTimer(): void {
        if (this.renewTimer) {
            clearTimeout(this.renewTimer);
            this.renewTimer = undefined;
        }
    }

    private stopCurrentPlayback(): void {
        this.resource?.playStream.destroy();
        this.resource = undefined;
        this.ffmpeg?.stop();
        this.ffmpeg = undefined;
    }

    private assertNotDisposed(): void {
        if (this.playbackState === 'disposed') {
            throw new AudioManagerStateError('AudioManager has been disposed.');
        }
    }
}
