import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { sep } from 'node:path';
import { PassThrough } from 'node:stream';

import AudioManager from '../src/audio-manager';
import { AudioManagerConfigError, AudioManagerStateError } from '@/errors';
import { startFfmpeg } from '@/ffmpeg';
import type { AudioSource, VoiceConnectionOptions } from '@/types';

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

jest.mock('@/ffmpeg', () => ({
    startFfmpeg: jest.fn(() => mockFfmpegHandle),
}));

const connectionOptions: VoiceConnectionOptions = {
    guildId: 'guild-id',
    channelId: 'channel-id',
    adapterCreator: jest.fn() as unknown as VoiceConnectionOptions['adapterCreator'],
};

const source: AudioSource = {
    type: 'url',
    url: 'https://example.com/audio.mp3',
};

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
            source,
            renewIntervalMs: false,
        });

        await manager.start();

        expect(manager.state).toBe('playing');
        expect(manager.isConnected).toBe(true);
        expect(manager.isPlaying).toBe(true);
        expect(mockConnection.subscribe).toHaveBeenCalledWith(mockAudioPlayer);
        expect(startFfmpeg).toHaveBeenCalledWith('https://example.com/audio.mp3', undefined);
        expect(mockAudioPlayer.play).toHaveBeenCalledWith(mockAudioResource);
    });

    it('resolves file sources against the current working directory', async () => {
        const manager = new AudioManager({
            connection: connectionOptions,
            source: {
                type: 'file',
                path: 'audio/song.mp3',
            },
            renewIntervalMs: false,
        });

        await manager.start();

        expect(startFfmpeg).toHaveBeenCalledWith(expect.stringContaining(`audio${sep}song.mp3`), undefined);
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
            source,
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

    it('pauses and resumes only from valid playback states', async () => {
        const manager = new AudioManager({
            connection: connectionOptions,
            source,
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
            source,
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

    it('clears existing renewal timer before reconnecting', async () => {
        jest.useFakeTimers();

        const manager = new AudioManager({
            connection: connectionOptions,
            source,
            renewIntervalMs: 10_000,
        });

        await manager.connect();
        await manager.connect();

        expect(jest.getTimerCount()).toBe(1);
        manager.dispose();
        expect(jest.getTimerCount()).toBe(0);
    });

    it('prevents use after disposal', async () => {
        const manager = new AudioManager({
            connection: connectionOptions,
            source,
            renewIntervalMs: false,
        });

        await manager.start();
        manager.dispose();

        expect(() => manager.pause()).toThrow(AudioManagerStateError);
        expect(manager.state).toBe('disposed');
    });
});
