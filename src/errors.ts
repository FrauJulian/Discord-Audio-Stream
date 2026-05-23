export class AudioManagerError extends Error {
    public constructor(message: string) {
        super(message);
        this.name = new.target.name;
    }
}

export class AudioManagerConfigError extends AudioManagerError {}

export class AudioManagerStateError extends AudioManagerError {}

export class FfmpegProcessError extends AudioManagerError {
    public constructor(
        message: string,
        public readonly cause?: unknown,
    ) {
        super(message);
    }
}
