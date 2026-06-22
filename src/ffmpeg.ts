import { spawn } from 'node:child_process';
import type { ChildProcessByStdio } from 'node:child_process';
import { createRequire } from 'node:module';
import type { Readable } from 'node:stream';

import { AudioManagerConfigError, FfmpegProcessError } from './errors';
import type { FfmpegOptions } from './types';

const requireFromCurrentModule = createRequire(__filename);

const DEFAULT_INPUT_ARGS = ['-hide_banner', '-loglevel', 'error', '-nostdin'] as const;
const DEFAULT_OUTPUT_ARGS = ['-vn', '-f', 's16le', '-ar', '48000', '-ac', '2', 'pipe:1'] as const;
const FORCE_KILL_TIMEOUT_MS = 2_000;
const STDERR_TAIL_BYTES = 4_096;

export type FfmpegProcessHandle = {
    process: ChildProcessByStdio<null, Readable, Readable>;
    ready: Promise<void>;
    stop(): void;
};

export function resolveFfmpegExecutable(options: FfmpegOptions = {}): string {
    if (options.executablePath?.trim()) {
        return options.executablePath;
    }

    if ((options.mode ?? 'native') === 'native') {
        return 'ffmpeg';
    }

    try {
        const executable = requireFromCurrentModule('ffmpeg-static') as unknown;

        if (typeof executable === 'string' && executable.length > 0) {
            return executable;
        }
    } catch (error) {
        throw new AudioManagerConfigError(
            `Unable to resolve ffmpeg-static. Install it or pass ffmpeg.executablePath. Cause: ${String(error)}`,
        );
    }

    throw new AudioManagerConfigError('ffmpeg-static did not expose an executable path.');
}

export function startFfmpeg(input: string, options: FfmpegOptions = {}): FfmpegProcessHandle {
    const executable = resolveFfmpegExecutable(options);
    const args = [
        ...(options.inputArgs ?? DEFAULT_INPUT_ARGS),
        '-i',
        input,
        ...(options.outputArgs ?? DEFAULT_OUTPUT_ARGS),
    ];
    const childProcess = spawn(executable, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const ready = waitForFfmpegOutput(childProcess);

    childProcess.stderr.resume();

    return {
        process: childProcess,
        ready,
        stop: (): void => {
            stopProcess(childProcess);
        },
    };
}

function waitForFfmpegOutput(childProcess: ChildProcessByStdio<null, Readable, Readable>): Promise<void> {
    let stderrTail = '';

    const appendStderr = (chunk: Buffer | string): void => {
        stderrTail = (stderrTail + String(chunk)).slice(-STDERR_TAIL_BYTES);
    };

    childProcess.stderr.on('data', appendStderr);

    return new Promise((resolve, reject) => {
        const cleanup = (): void => {
            childProcess.off('error', onError);
            childProcess.off('exit', onExit);
            childProcess.stdout.off('readable', onReadable);
        };

        const fail = (message: string, cause?: unknown): void => {
            cleanup();
            reject(new FfmpegProcessError(addStderrTail(message, stderrTail), cause));
        };

        const onError = (error: Error): void => {
            fail(`Unable to start ffmpeg. Cause: ${error.message}`, error);
        };

        const onExit = (code: number | null, signal: NodeJS.Signals | null): void => {
            fail(`ffmpeg exited before producing audio. Exit code: ${code ?? 'none'}, signal: ${signal ?? 'none'}.`);
        };

        const onReadable = (): void => {
            cleanup();
            resolve();
        };

        childProcess.once('error', onError);
        childProcess.once('exit', onExit);
        childProcess.stdout.once('readable', onReadable);
    });
}

function addStderrTail(message: string, stderrTail: string): string {
    const trimmedTail = stderrTail.trim();

    return trimmedTail ? `${message} stderr: ${trimmedTail}` : message;
}

function stopProcess(childProcess: ChildProcessByStdio<null, Readable, Readable>): void {
    childProcess.stdout.destroy();
    childProcess.stderr.destroy();
    childProcess.removeAllListeners();

    if (childProcess.killed || childProcess.exitCode !== null || childProcess.signalCode !== null) {
        return;
    }

    childProcess.kill('SIGTERM');

    const forceKillTimeout = setTimeout(() => {
        if (!childProcess.killed && childProcess.exitCode === null && childProcess.signalCode === null) {
            childProcess.kill('SIGKILL');
        }
    }, FORCE_KILL_TIMEOUT_MS);

    forceKillTimeout.unref();
}
