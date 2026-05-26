import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { spawn } from 'node:child_process';

import { resolveFfmpegExecutable, startFfmpeg } from '../src/ffmpeg';

jest.mock('node:child_process', () => ({
    spawn: jest.fn(),
}));

const mockSpawn = jest.mocked(spawn);

type MockChildProcess = {
    stdout: {
        destroy: jest.Mock;
    };
    stderr: {
        destroy: jest.Mock;
        resume: jest.Mock;
    };
    once: jest.Mock;
    removeAllListeners: jest.Mock;
    kill: jest.Mock;
    killed: boolean;
    exitCode: number | null;
    signalCode: NodeJS.Signals | null;
};

function createMockChildProcess(): MockChildProcess {
    return {
        stdout: {
            destroy: jest.fn(),
        },
        stderr: {
            destroy: jest.fn(),
            resume: jest.fn(),
        },
        once: jest.fn(),
        removeAllListeners: jest.fn(),
        kill: jest.fn(),
        killed: false,
        exitCode: null,
        signalCode: null,
    };
}

describe('ffmpeg helpers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('prefers an explicit executable path', () => {
        expect(resolveFfmpegExecutable({ executablePath: '/custom/ffmpeg' })).toBe('/custom/ffmpeg');
    });

    it('uses the native ffmpeg binary by default', () => {
        expect(resolveFfmpegExecutable()).toBe('ffmpeg');
        expect(resolveFfmpegExecutable({ mode: 'native' })).toBe('ffmpeg');
    });

    it('spawns ffmpeg with the default argument set', () => {
        const childProcess = createMockChildProcess();
        mockSpawn.mockReturnValue(childProcess);

        startFfmpeg('https://synradiode.stream.laut.fm/synradiode');

        expect(mockSpawn).toHaveBeenCalledWith(
            'ffmpeg',
            [
                '-hide_banner',
                '-loglevel',
                'error',
                '-nostdin',
                '-i',
                'https://synradiode.stream.laut.fm/synradiode',
                '-vn',
                '-f',
                's16le',
                '-ar',
                '48000',
                '-ac',
                '2',
                'pipe:1',
            ],
            { stdio: ['ignore', 'pipe', 'pipe'] },
        );
        expect(childProcess.once).toHaveBeenCalledWith('error', expect.any(Function));
        expect(childProcess.stderr.resume).toHaveBeenCalledTimes(1);
    });

    it('uses custom executable and argument overrides when provided', () => {
        const childProcess = createMockChildProcess();
        mockSpawn.mockReturnValue(childProcess);

        startFfmpeg('tests/audio.mp3', {
            executablePath: '/custom/ffmpeg',
            inputArgs: ['-re'],
            outputArgs: ['-f', 'wav', 'pipe:1'],
        });

        expect(mockSpawn).toHaveBeenCalledWith(
            '/custom/ffmpeg',
            ['-re', '-i', 'tests/audio.mp3', '-f', 'wav', 'pipe:1'],
            { stdio: ['ignore', 'pipe', 'pipe'] },
        );
    });

    it('stops a running child process and schedules a force kill fallback', () => {
        jest.useFakeTimers();
        const childProcess = createMockChildProcess();
        mockSpawn.mockReturnValue(childProcess);

        const handle = startFfmpeg('tests/audio.mp3');
        handle.stop();

        expect(childProcess.stdout.destroy).toHaveBeenCalledTimes(1);
        expect(childProcess.stderr.destroy).toHaveBeenCalledTimes(1);
        expect(childProcess.removeAllListeners).toHaveBeenCalledTimes(1);
        expect(childProcess.kill).toHaveBeenCalledWith('SIGTERM');

        jest.advanceTimersByTime(2_000);

        expect(childProcess.kill).toHaveBeenNthCalledWith(2, 'SIGKILL');
    });

    it('does not signal a process that already exited', () => {
        const childProcess = createMockChildProcess();
        childProcess.exitCode = 0;
        mockSpawn.mockReturnValue(childProcess);

        const handle = startFfmpeg('tests/audio.mp3');
        handle.stop();

        expect(childProcess.kill).not.toHaveBeenCalled();
    });
});
