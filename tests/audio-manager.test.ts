import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { resolve } from 'node:path';
import { PassThrough } from 'node:stream';

import AudioManager from '../src/audio-manager';
import { AudioManagerConfigError, AudioManagerStateError } from '../src';
import { startFfmpeg } from '../src/ffmpeg';
import type { AudioSource, VoiceConnectionOptions } from '../src';

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
const mockAudioResource = {
    playStream: {
        destroy: jest.fn(),
    },
    volume: {
        setVolume: jest.fn(),
    },
};
const mockFfmpegHandle = {
    process: {
        stdout: new PassThrough(),
    },
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
    entersState: jest.fn(() => Promise.resolve(mockConnection)),
    joinVoiceChannel: jest.fn(() => mockConnection),
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
