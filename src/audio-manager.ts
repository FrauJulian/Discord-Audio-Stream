import type { AudioPlayer, AudioResource, VoiceConnection } from '@discordjs/voice';
import {
    createAudioPlayer,
    createAudioResource,
    entersState,
    joinVoiceChannel,
    AudioPlayerStatus,
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
const DISCONNECT_RECOVERY_TIMEOUT_MS = 5_000;
const MAX_TIMER_DELAY_MS = 2_147_483_647;

function assertValidTimerDelay(value: number, optionName: string): void {
    if (!Number.isSafeInteger(value) || value <= 0 || value > MAX_TIMER_DELAY_MS) {
        throw new AudioManagerConfigError(
            `${optionName} must be an integer between 1 and ${MAX_TIMER_DELAY_MS} milliseconds.`,
        );
    }
}

function assertValidVolumePercent(value: number): void {
    if (!Number.isFinite(value) || value < 0 || value > 100) {
        throw new AudioManagerConfigError('Volume must be between 0 and 100 percent.');
    }
}

export default class AudioManager implements Disposable {
    private readonly audioPlayer: AudioPlayer;

    private connection: VoiceConnection | undefined;
    private resource: AudioResource | undefined;
    private ffmpeg: FfmpegProcessHandle | undefined;
    private connectAttempt: AbortController | undefined;
    private renewTimer: NodeJS.Timeout | undefined;
    private playbackState: PlaybackState = 'idle';
    private connectionOptions: VoiceConnectionOptions | undefined;
    private audioSource: AudioSource | undefined;
    private readonly options: Required<Pick<AudioManagerOptions, 'connectTimeoutMs'>> &
        Omit<AudioManagerOptions, 'connectTimeoutMs'>;

    public constructor(options: AudioManagerOptions = {}) {
        const connectTimeoutMs = options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS;
        assertValidTimerDelay(connectTimeoutMs, 'connectTimeoutMs');

        if (typeof options.renewIntervalMs === 'number') {
            assertValidTimerDelay(options.renewIntervalMs, 'renewIntervalMs');
        }

        if (options.volume?.initialPercent !== undefined) {
            if (options.volume.enabled !== true) {
                throw new AudioManagerConfigError('volume.initialPercent requires volume.enabled to be true.');
            }
            assertValidVolumePercent(options.volume.initialPercent);
        }

        this.options = {
            ...options,
            connectTimeoutMs,
        };
        this.connectionOptions = options.connection;
        this.audioSource = options.source;
        this.audioPlayer = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Play,
            },
        });
        this.audioPlayer.on('error', (error) => {
            this.finishPlayback(error.resource);
            this.reportError(error);
        });
        this.audioPlayer.on(AudioPlayerStatus.Idle, (oldState) => {
            if ('resource' in oldState) {
                this.finishPlayback(oldState.resource);
            }
        });
    }

    public get state(): PlaybackState {
        return this.playbackState;
    }

    public get isPlaying(): boolean {
        return this.playbackState === 'playing';
    }

    public get isConnected(): boolean {
        return this.connection?.state.status === VoiceConnectionStatus.Ready;
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

        this.cancelConnectAttempt();
        const attempt = new AbortController();
        this.connectAttempt = attempt;
        this.clearRenewTimer();
        this.playbackState = 'connecting';

        const previousConnection = this.connection;
        this.connection = undefined;
        let connection: VoiceConnection | undefined;

        try {
            previousConnection?.destroy();
            connection = joinVoiceChannel({
                guildId: this.connectionOptions.guildId,
                channelId: this.connectionOptions.channelId,
                adapterCreator: this.connectionOptions.adapterCreator,
            });
            this.connection = connection;
            this.observeConnection(connection);
            connection.subscribe(this.audioPlayer);

            await entersState(
                connection,
                VoiceConnectionStatus.Ready,
                AbortSignal.any([attempt.signal, AbortSignal.timeout(this.options.connectTimeoutMs)]),
            );
        } catch (error) {
            if (this.connectAttempt !== attempt) {
                throw new AudioManagerStateError('Voice connection was stopped before it became ready.', {
                    cause: error,
                });
            }

            this.connectAttempt = undefined;
            if (connection && connection.state.status !== VoiceConnectionStatus.Destroyed) {
                connection.destroy();
            }
            if (this.connection === connection) {
                this.connection = undefined;
            }
            this.playbackState = 'stopped';
            throw error;
        }

        if (this.connectAttempt !== attempt || this.connection !== connection) {
            throw new AudioManagerStateError('Voice connection was stopped before it became ready.');
        }

        this.connectAttempt = undefined;
        this.playbackState = 'ready';
        this.scheduleRenewal();
    }

    public async play(source?: AudioSource): Promise<void> {
        this.assertNotDisposed();

        if (source) {
            this.setSource(source);
        }

        if (!this.isConnected) {
            throw new AudioManagerStateError('A voice connection is required before audio can be played.');
        }

        const resolvedSource = this.resolveSource();
        this.stopCurrentPlayback();
        this.ffmpeg = startFfmpeg(resolvedSource.input, this.options.ffmpeg);
        const ffmpeg = this.ffmpeg;
        try {
            await ffmpeg.ready;
            if (this.ffmpeg !== ffmpeg) {
                throw new AudioManagerStateError('Playback was stopped before ffmpeg became ready.');
            }
            this.resource = createAudioResource(ffmpeg.process.stdout, {
                inputType: StreamType.Raw,
                inlineVolume: this.options.volume?.enabled === true,
            });
        } catch (error) {
            if (this.ffmpeg !== ffmpeg) {
                throw error instanceof AudioManagerStateError
                    ? error
                    : new AudioManagerStateError('Playback was stopped before ffmpeg became ready.', {
                          cause: error,
                      });
            }

            this.stopCurrentPlayback();
            throw error;
        }

        try {
            if (this.options.volume?.enabled === true && this.options.volume.initialPercent !== undefined) {
                this.setVolume(this.options.volume.initialPercent);
            }
            this.audioPlayer.play(this.resource);
            this.playbackState = 'playing';
        } catch (error) {
            this.stopCurrentPlayback();
            this.playbackState = 'ready';
            throw error;
        }
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

        this.cancelConnectAttempt();
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

        assertValidVolumePercent(volumeInPercent);

        if (!this.resource?.volume) {
            throw new AudioManagerStateError('No audio resource with volume control is currently active.');
        }

        this.resource.volume.setVolume(volumeInPercent / 100);
    }

    public dispose(): void {
        if (this.playbackState === 'disposed') {
            return;
        }

        this.cancelConnectAttempt();
        this.clearRenewTimer();
        this.stopCurrentPlayback();
        this.audioPlayer.stop(true);
        this.connection?.destroy();
        this.connection = undefined;
        this.connectionOptions = undefined;
        this.audioSource = undefined;
        this.playbackState = 'disposed';
    }

    public [Symbol.dispose](): void {
        this.dispose();
    }

    private resolveSource(): ResolvedAudioSource {
        if (!this.audioSource) {
            throw new AudioManagerConfigError('Audio source is required before playback can start.');
        }

        if (this.audioSource.type === 'url') {
            try {
                const url = new URL(this.audioSource.url);
                if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                    throw new Error('Unsupported audio source protocol.');
                }

                return {
                    input: url.toString(),
                    source: this.audioSource,
                };
            } catch (error) {
                throw new AudioManagerConfigError('Invalid audio source URL.', { cause: error });
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
        const renewIntervalMs = this.options.renewIntervalMs;

        if (renewIntervalMs === undefined || renewIntervalMs === false) {
            return;
        }

        this.renewTimer = setTimeout(() => {
            void this.start().catch((error: unknown) => {
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
                this.reportError(error);
            });
        }, renewIntervalMs);

        if (typeof this.renewTimer.unref === 'function') {
            this.renewTimer.unref();
        }
    }

    private observeConnection(connection: VoiceConnection): void {
        connection.on('error', (error) => {
            this.reportError(error);
        });
        connection.on(VoiceConnectionStatus.Disconnected, () => this.handleDisconnectedConnection(connection));
    }

    private async handleDisconnectedConnection(connection: VoiceConnection): Promise<void> {
        try {
            await Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, DISCONNECT_RECOVERY_TIMEOUT_MS),
                entersState(connection, VoiceConnectionStatus.Connecting, DISCONNECT_RECOVERY_TIMEOUT_MS),
            ]);
        } catch (error) {
            if (this.connection !== connection) {
                return;
            }

            this.clearRenewTimer();
            this.stopCurrentPlayback();
            this.audioPlayer.stop(true);
            this.connection = undefined;
            if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
                connection.destroy();
            }
            this.playbackState = 'stopped';
            this.reportError(error);
        }
    }

    private finishPlayback(resource: AudioResource): void {
        if (this.resource !== resource) {
            return;
        }

        this.stopCurrentPlayback();
        if (this.playbackState !== 'disposed') {
            this.playbackState = this.isConnected ? 'ready' : 'stopped';
        }
    }

    private reportError(error: unknown): void {
        this.options.onError?.(error instanceof Error ? error : new Error(String(error)));
    }

    private clearRenewTimer(): void {
        if (this.renewTimer) {
            clearTimeout(this.renewTimer);
            this.renewTimer = undefined;
        }
    }

    private cancelConnectAttempt(): void {
        this.connectAttempt?.abort();
        this.connectAttempt = undefined;
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
