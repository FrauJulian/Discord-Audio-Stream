import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { createAudioResource, entersState, joinVoiceChannel } from '@discordjs/voice';
import { resolve } from 'node:path';
import { PassThrough } from 'node:stream';

import AudioManager from '../src/audio-manager';
import { AudioManagerConfigError, AudioManagerStateError, FfmpegProcessError } from '../src';
import { startFfmpeg } from '../src/ffmpeg';
import type { FfmpegProcessHandle } from '../src/ffmpeg';
import type { AudioSource, VoiceConnectionOptions } from '../src';
import type { VoiceConnection } from '@discordjs/voice';

const mockAudioPlayer = {
    play: jest.fn(),
    pause: jest.fn(),
    unpause: jest.fn(),
    stop: jest.fn(),
};
const mockConnection = {
    subscribe: jest.fn(),
    disconnect: jest.fn(),
    destroy: jest.fn(),
};
const mockSecondConnection = {
    subscribe: jest.fn(),
    disconnect: jest.fn(),
    destroy: jest.fn(),
};
const mockVoiceConnection = mockConnection as unknown as VoiceConnection;
const mockSecondVoiceConnection = mockSecondConnection as unknown as VoiceConnection;
const mockAudioResource = {
    playStream: {
        destroy: jest.fn(),
    },
    volume: {
        setVolume: jest.fn(),
    },
};
const mockFfmpegHandle: FfmpegProcessHandle = {
    process: {
        stdout: new PassThrough(),
    } as unknown as FfmpegProcessHandle['process'],
    ready: Promise.resolve(),
    stop: jest.fn(),
};

jest.mock('@discordjs/voice', () => ({
    NoSubscriberBehavior: {
        Play: 'play',
    },
    StreamType: {
        Raw: 'raw',
    },
    VoiceConnectionStatus: {
        Ready: 'ready',
    },
    createAudioPlayer: jest.fn(() => mockAudioPlayer),
    createAudioResource: jest.fn(() => mockAudioResource),
    entersState: jest.fn(() => Promise.resolve(mockVoiceConnection)),
    joinVoiceChannel: jest.fn(() => mockVoiceConnection),
}));

jest.mock('../src/ffmpeg', () => ({
    startFfmpeg: jest.fn(() => mockFfmpegHandle),
}));

const connectionOptions: VoiceConnectionOptions = {
    guildId: 'guild-id',
    channelId: 'channel-id',
    adapterCreator: jest.fn() as unknown as VoiceConnectionOptions['adapterCreator'],
};

const liveStreamSource: AudioSource = {
    type: 'url',
    url: 'https://synradiode.stream.laut.fm/synradiode',
};

const fileSourcePath = 'tests/audio.mp3';
const resolvedFileSourcePath = resolve(process.cwd(), fileSourcePath);
type MockedEntersStateReturn = ReturnType<typeof entersState>;

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((promiseResolve) => {
        resolve = promiseResolve;
    });

    return { promise, resolve };
}

function createMockFfmpegHandle(): FfmpegProcessHandle {
    return {
        process: {
            stdout: new PassThrough(),
        } as unknown as FfmpegProcessHandle['process'],
        ready: Promise.resolve(),
        stop: jest.fn(),
    };
}

describe('AudioManager', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('requires connection options before connecting', async () => {
        const manager = new AudioManager({ renewIntervalMs: false });

        await expect(manager.connect()).rejects.toThrow(AudioManagerConfigError);
    });

    it('connects and starts playback with resolved URL source', async () => {
        const manager = new AudioManager({
            connection: connectionOptions,
            source: liveStreamSource,
            renewIntervalMs: false,
        });

        await manager.start();

        expect(manager.state).toBe('playing');
        expect(manager.isConnected).toBe(true);
        expect(manager.isPlaying).toBe(true);
        expect(mockConnection.subscribe).toHaveBeenCalledWith(mockAudioPlayer);
        expect(startFfmpeg).toHaveBeenCalledWith('https://synradiode.stream.laut.fm/synradiode', undefined);
        expect(mockAudioPlayer.play).toHaveBeenCalledWith(mockAudioResource);
    });

    it('cleans up when connection startup fails', async () => {
        jest.useFakeTimers();

        const manager = new AudioManager({
            connection: connectionOptions,
            renewIntervalMs: 10_000,
        });
        jest.mocked(entersState).mockRejectedValueOnce(new Error('voice connection timeout'));

        await expect(manager.connect()).rejects.toThrow('voice connection timeout');

        expect(manager.state).toBe('stopped');
        expect(manager.isConnected).toBe(false);
        expect(mockConnection.subscribe).toHaveBeenCalledWith(mockAudioPlayer);
        expect(mockConnection.destroy).toHaveBeenCalledTimes(1);
        expect(jest.getTimerCount()).toBe(0);
    });

    it('does not become ready when stopped during connection startup', async () => {
        jest.useFakeTimers();
        const ready = deferred<VoiceConnection>();
        jest.mocked(entersState).mockReturnValueOnce(ready.promise as unknown as MockedEntersStateReturn);
        const manager = new AudioManager({
            connection: connectionOptions,
            renewIntervalMs: 10_000,
        });

        const connectPromise = manager.connect();
        await manager.stop();
        ready.resolve(mockVoiceConnection);

        await expect(connectPromise).rejects.toThrow(AudioManagerStateError);

        expect(manager.state).toBe('stopped');
        expect(manager.isConnected).toBe(false);
        expect(jest.getTimerCount()).toBe(0);
    });

    it('keeps the latest connection when concurrent connects resolve out of order', async () => {
        const firstReady = deferred<VoiceConnection>();
        const secondReady = deferred<VoiceConnection>();
        jest.mocked(joinVoiceChannel)
            .mockReturnValueOnce(mockVoiceConnection)
            .mockReturnValueOnce(mockSecondVoiceConnection);
        jest.mocked(entersState)
            .mockReturnValueOnce(firstReady.promise as unknown as MockedEntersStateReturn)
            .mockReturnValueOnce(secondReady.promise as unknown as MockedEntersStateReturn);
        const manager = new AudioManager({
            connection: connectionOptions,
            renewIntervalMs: false,
        });

        const firstConnect = manager.connect();
        const secondConnect = manager.connect();
        firstReady.resolve(mockVoiceConnection);
        secondReady.resolve(mockSecondVoiceConnection);

        await expect(firstConnect).rejects.toThrow(AudioManagerStateError);
        await expect(secondConnect).resolves.toBeUndefined();

        expect(manager.state).toBe('ready');
        expect(manager.isConnected).toBe(true);
        expect(mockConnection.destroy).toHaveBeenCalledTimes(1);
        expect(mockSecondConnection.destroy).not.toHaveBeenCalled();
    });

    it('does not become ready when disposed during connection startup', async () => {
        const ready = deferred<VoiceConnection>();
        jest.mocked(entersState).mockReturnValueOnce(ready.promise as unknown as MockedEntersStateReturn);
        const manager = new AudioManager({
            connection: connectionOptions,
            renewIntervalMs: false,
        });

        const connectPromise = manager.connect();
        manager.dispose();
        ready.resolve(mockVoiceConnection);

        await expect(connectPromise).rejects.toThrow(AudioManagerStateError);

        expect(manager.state).toBe('disposed');
        expect(manager.isConnected).toBe(false);
        expect(mockConnection.destroy).toHaveBeenCalledTimes(1);
    });

    it('starts playback with the committed mp3 test file', async () => {
        const manager = new AudioManager({
            connection: connectionOptions,
            source: {
                type: 'file',
                path: fileSourcePath,
            },
            renewIntervalMs: false,
        });

        await manager.start();

        expect(startFfmpeg).toHaveBeenCalledWith(resolvedFileSourcePath, undefined);
        expect(mockAudioPlayer.play).toHaveBeenCalledWith(mockAudioResource);
    });

    it('accepts the live stream URL as a valid source', async () => {
        const manager = new AudioManager({
            connection: connectionOptions,
            source: liveStreamSource,
            renewIntervalMs: false,
        });

        await manager.connect();
        await manager.play();

        expect(startFfmpeg).toHaveBeenCalledWith('https://synradiode.stream.laut.fm/synradiode', undefined);
    });

    it('plays a source passed directly to play()', async () => {
        const manager = new AudioManager({
            connection: connectionOptions,
            renewIntervalMs: false,
        });

        await manager.connect();
        await manager.play({
            type: 'file',
            path: fileSourcePath,
        });

        expect(startFfmpeg).toHaveBeenCalledWith(resolvedFileSourcePath, undefined);
        expect(manager.state).toBe('playing');
    });

    it('does not report playback when ffmpeg startup fails', async () => {
        const startupError = new FfmpegProcessError('Unable to start ffmpeg.');
        jest.mocked(startFfmpeg).mockReturnValueOnce({
            ...mockFfmpegHandle,
            ready: Promise.reject(startupError),
        });
        const manager = new AudioManager({
            connection: connectionOptions,
            source: liveStreamSource,
            renewIntervalMs: false,
        });

        await manager.connect();
        await expect(manager.play()).rejects.toBe(startupError);

        expect(manager.state).toBe('ready');
        expect(mockAudioPlayer.play).not.toHaveBeenCalled();
        expect(mockFfmpegHandle.stop).toHaveBeenCalledTimes(1);
    });

    it('cleans up when audio resource creation fails', async () => {
        const resourceError = new Error('resource failed');
        jest.mocked(createAudioResource).mockImplementationOnce(() => {
            throw resourceError;
        });
        const manager = new AudioManager({
            connection: connectionOptions,
            source: liveStreamSource,
            renewIntervalMs: false,
        });

        await manager.connect();
        await expect(manager.play()).rejects.toBe(resourceError);

        expect(manager.state).toBe('ready');
        expect(mockFfmpegHandle.stop).toHaveBeenCalledTimes(1);
        expect(mockAudioPlayer.play).not.toHaveBeenCalled();
    });

    it('cleans up when the audio player rejects playback', async () => {
        const playerError = new Error('player failed');
        mockAudioPlayer.play.mockImplementationOnce(() => {
            throw playerError;
        });
        const manager = new AudioManager({
            connection: connectionOptions,
            source: liveStreamSource,
            renewIntervalMs: false,
        });

        await manager.connect();
        await expect(manager.play()).rejects.toBe(playerError);

        expect(manager.state).toBe('ready');
        expect(mockFfmpegHandle.stop).toHaveBeenCalledTimes(1);
        expect(mockAudioResource.playStream.destroy).toHaveBeenCalledTimes(1);
    });

    it('does not report playback when stopped before ffmpeg is ready', async () => {
        const ready = deferred<void>();
        jest.mocked(startFfmpeg).mockReturnValueOnce({
            ...mockFfmpegHandle,
            ready: ready.promise,
        });
        const manager = new AudioManager({
            connection: connectionOptions,
            source: liveStreamSource,
            renewIntervalMs: false,
        });

        await manager.connect();
        const playPromise = manager.play();
        await manager.stop();
        ready.resolve();

        await expect(playPromise).rejects.toThrow(AudioManagerStateError);

        expect(manager.state).toBe('stopped');
        expect(mockAudioPlayer.play).not.toHaveBeenCalled();
    });

    it('does not report playback when disposed before ffmpeg is ready', async () => {
        const ready = deferred<void>();
        jest.mocked(startFfmpeg).mockReturnValueOnce({
            ...mockFfmpegHandle,
            ready: ready.promise,
        });
        const manager = new AudioManager({
            connection: connectionOptions,
            source: liveStreamSource,
            renewIntervalMs: false,
        });

        await manager.connect();
        const playPromise = manager.play();
        manager.dispose();
        ready.resolve();

        await expect(playPromise).rejects.toThrow(AudioManagerStateError);

        expect(manager.state).toBe('disposed');
        expect(mockAudioPlayer.play).not.toHaveBeenCalled();
    });

    it('keeps only the latest concurrent playback', async () => {
        const firstReady = deferred<void>();
        const firstHandle = {
            ...createMockFfmpegHandle(),
            ready: firstReady.promise,
        };
        const secondHandle = createMockFfmpegHandle();
        jest.mocked(startFfmpeg).mockReturnValueOnce(firstHandle).mockReturnValueOnce(secondHandle);
        const manager = new AudioManager({
            connection: connectionOptions,
            source: liveStreamSource,
            renewIntervalMs: false,
        });

        await manager.connect();
        const firstPlay = manager.play();
        const secondPlay = manager.play({ type: 'file', path: fileSourcePath });
        firstReady.resolve();

        await expect(firstPlay).rejects.toThrow(AudioManagerStateError);
        await expect(secondPlay).resolves.toBeUndefined();

        expect(manager.state).toBe('playing');
        expect(mockAudioPlayer.play).toHaveBeenCalledTimes(1);
        expect(firstHandle.stop).toHaveBeenCalledTimes(1);
        expect(secondHandle.stop).not.toHaveBeenCalled();
    });

    it('replaces active playback when a new source is played', async () => {
        const manager = new AudioManager({
            connection: connectionOptions,
            source: liveStreamSource,
            renewIntervalMs: false,
        });

        await manager.start();
        await manager.play({
            type: 'file',
            path: fileSourcePath,
        });

        expect(mockFfmpegHandle.stop).toHaveBeenCalledTimes(1);
        expect(mockAudioResource.playStream.destroy).toHaveBeenCalledTimes(1);
        expect(startFfmpeg).toHaveBeenLastCalledWith(resolvedFileSourcePath, undefined);
    });

    it('requires an active connection before play()', async () => {
        const manager = new AudioManager({
            source: liveStreamSource,
            renewIntervalMs: false,
        });

        await expect(manager.play()).rejects.toThrow(AudioManagerStateError);
    });

    it('requires a source before play()', async () => {
        const manager = new AudioManager({
            connection: connectionOptions,
            renewIntervalMs: false,
        });

        await manager.connect();

        await expect(manager.play()).rejects.toThrow(AudioManagerConfigError);
    });

    it('rejects invalid URL sources', async () => {
        const manager = new AudioManager({
            connection: connectionOptions,
            source: {
                type: 'url',
                url: 'not a url',
            },
            renewIntervalMs: false,
        });

        await manager.connect();

        await expect(manager.play()).rejects.toThrow(AudioManagerConfigError);
    });

    it('applies initial volume only when volume support is enabled', async () => {
        const manager = new AudioManager({
            connection: connectionOptions,
            source: liveStreamSource,
            renewIntervalMs: false,
            volume: {
                enabled: true,
                initialPercent: 35,
            },
        });

        await manager.start();

        expect(mockAudioResource.volume.setVolume).toHaveBeenCalledWith(0.35);
    });

    it('rejects volume changes when inline volume is disabled', () => {
        const manager = new AudioManager({ renewIntervalMs: false });

        expect(() => manager.setVolume(50)).toThrow(AudioManagerStateError);
    });

    it('rejects invalid volume percentages', async () => {
        const manager = new AudioManager({
            connection: connectionOptions,
            source: liveStreamSource,
            renewIntervalMs: false,
            volume: {
                enabled: true,
            },
        });

        await manager.start();

        expect(() => manager.setVolume(-1)).toThrow(AudioManagerConfigError);
        expect(() => manager.setVolume(101)).toThrow(AudioManagerConfigError);
        expect(() => manager.setVolume(Number.NaN)).toThrow(AudioManagerConfigError);
        expect(() => manager.setVolume(Number.POSITIVE_INFINITY)).toThrow(AudioManagerConfigError);
        expect(() => manager.setVolume(Number.NEGATIVE_INFINITY)).toThrow(AudioManagerConfigError);
        expect(() => manager.setVolume(0)).not.toThrow();
        expect(() => manager.setVolume(42)).not.toThrow();
        expect(() => manager.setVolume(100)).not.toThrow();
    });

    it('rejects volume changes before any resource exists', () => {
        const manager = new AudioManager({
            renewIntervalMs: false,
            volume: {
                enabled: true,
            },
        });

        expect(() => manager.setVolume(50)).toThrow(AudioManagerStateError);
    });

    it('pauses and resumes only from valid playback states', async () => {
        const manager = new AudioManager({
            connection: connectionOptions,
            source: liveStreamSource,
            renewIntervalMs: false,
        });

        expect(() => manager.pause()).toThrow(AudioManagerStateError);

        await manager.start();
        manager.pause();
        manager.resume();

        expect(mockAudioPlayer.pause).toHaveBeenCalledTimes(1);
        expect(mockAudioPlayer.unpause).toHaveBeenCalledTimes(1);
        expect(manager.state).toBe('playing');
    });

    it('stops playback and voice resources idempotently', async () => {
        const manager = new AudioManager({
            connection: connectionOptions,
            source: liveStreamSource,
            renewIntervalMs: false,
        });

        await manager.start();
        await manager.stop();
        await manager.stop();

        expect(mockFfmpegHandle.stop).toHaveBeenCalledTimes(1);
        expect(mockAudioResource.playStream.destroy).toHaveBeenCalledTimes(1);
        expect(mockConnection.destroy).toHaveBeenCalled();
        expect(manager.state).toBe('stopped');
    });

    it('rejects pause and resume after stop', async () => {
        const manager = new AudioManager({
            connection: connectionOptions,
            source: liveStreamSource,
            renewIntervalMs: false,
        });

        await manager.start();
        await manager.stop();

        expect(() => manager.pause()).toThrow(AudioManagerStateError);
        expect(() => manager.resume()).toThrow(AudioManagerStateError);
    });

    it('restarts playback when the renewal timer fires', async () => {
        jest.useFakeTimers();

        const manager = new AudioManager({
            connection: connectionOptions,
            source: liveStreamSource,
            renewIntervalMs: 10_000,
        });
        const startSpy = jest.spyOn(manager, 'start').mockResolvedValue(undefined);

        await manager.connect();
        jest.advanceTimersByTime(10_000);
        await Promise.resolve();

        expect(startSpy).toHaveBeenCalledTimes(1);
    });

    it('cleans up when renewal restart fails', async () => {
        jest.useFakeTimers();

        const manager = new AudioManager({
            connection: connectionOptions,
            source: liveStreamSource,
            renewIntervalMs: 10_000,
        });
        const startSpy = jest.spyOn(manager, 'start').mockRejectedValue(new Error('renewal failed'));

        await manager.connect();
        jest.advanceTimersByTime(10_000);
        await Promise.resolve();

        expect(startSpy).toHaveBeenCalledTimes(1);
        expect(mockAudioPlayer.stop).toHaveBeenCalledWith(true);
        expect(mockConnection.destroy).toHaveBeenCalled();
        expect(manager.state).toBe('stopped');
        expect(jest.getTimerCount()).toBe(0);
    });

    it('clears existing renewal timer before reconnecting', async () => {
        jest.useFakeTimers();

        const manager = new AudioManager({
            connection: connectionOptions,
            source: liveStreamSource,
            renewIntervalMs: 10_000,
        });

        await manager.connect();
        await manager.connect();

        expect(jest.getTimerCount()).toBe(1);
        manager.dispose();
        expect(jest.getTimerCount()).toBe(0);
    });

    it('blocks source and connection changes after disposal', async () => {
        const manager = new AudioManager({
            connection: connectionOptions,
            source: liveStreamSource,
            renewIntervalMs: false,
        });

        manager.dispose();

        expect(() => manager.setSource(liveStreamSource)).toThrow(AudioManagerStateError);
        expect(() => manager.setConnection(connectionOptions)).toThrow(AudioManagerStateError);
    });

    it('prevents use after disposal', async () => {
        const manager = new AudioManager({
            connection: connectionOptions,
            source: liveStreamSource,
            renewIntervalMs: false,
        });

        await manager.start();
        manager.dispose();

        expect(() => manager.pause()).toThrow(AudioManagerStateError);
        expect(manager.state).toBe('disposed');
    });
});
