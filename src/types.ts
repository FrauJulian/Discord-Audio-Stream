import type { DiscordGatewayAdapterCreator } from '@discordjs/voice';

/**
 * Strategy used to resolve the ffmpeg executable.
 *
 * - `native` uses the `ffmpeg` binary available on the host PATH.
 * - `static` resolves the optional `ffmpeg-static` package.
 */
export type FfmpegMode = 'native' | 'static';

/**
 * Audio input consumed by ffmpeg.
 *
 * URL sources are validated through the built-in `URL` constructor before playback starts.
 * File sources may be absolute or relative; relative paths are resolved from `process.cwd()`.
 */
export type AudioSource =
    | {
          /**
           * Marks this source as a remote URL.
           */
          type: 'url';

          /**
           * Fully qualified audio URL passed to ffmpeg.
           */
          url: string;
      }
    | {
          /**
           * Marks this source as a local file path.
           */
          type: 'file';

          /**
           * Absolute file path or path relative to `process.cwd()`.
           */
          path: string;
      };

/**
 * Discord voice channel connection settings.
 */
export type VoiceConnectionOptions = {
    /**
     * Discord guild/server ID.
     */
    guildId: string;

    /**
     * Discord voice channel ID where audio should be played.
     */
    channelId: string;

    /**
     * Discord voice adapter creator, usually `guild.voiceAdapterCreator` from discord.js.
     */
    adapterCreator: DiscordGatewayAdapterCreator;
};

/**
 * Public playback lifecycle state exposed by `AudioManager.state`.
 */
export type PlaybackState = 'idle' | 'connecting' | 'ready' | 'playing' | 'paused' | 'stopped' | 'disposed';

/**
 * ffmpeg executable and argument configuration.
 */
export type FfmpegOptions = {
    /**
     * ffmpeg resolution mode.
     *
     * @defaultValue `'native'`
     */
    mode?: FfmpegMode;

    /**
     * Explicit ffmpeg executable path.
     *
     * When provided, this value takes precedence over `mode`.
     */
    executablePath?: string;

    /**
     * Arguments placed before `-i <source>`.
     *
     * Override only when you need full control over ffmpeg input behavior.
     */
    inputArgs?: readonly string[];

    /**
     * Arguments placed after `-i <source>`.
     *
     * If overridden, the output must remain compatible with `StreamType.Raw`.
     */
    outputArgs?: readonly string[];
};

/**
 * Optional inline volume control settings.
 */
export type VolumeOptions = {
    /**
     * Enables Discord voice inline volume support.
     *
     * Disabled by default because inline volume has runtime overhead.
     *
     * @defaultValue `false`
     */
    enabled?: boolean;

    /**
     * Initial volume percentage applied when playback starts.
     *
     * Requires `enabled: true`.
     */
    initialPercent?: number;
};

/**
 * Constructor options for `AudioManager`.
 */
export type AudioManagerOptions = {
    /**
     * ffmpeg executable and argument configuration.
     */
    ffmpeg?: FfmpegOptions;

    /**
     * Initial Discord voice connection settings.
     *
     * May also be supplied later through `setConnection()`.
     */
    connection?: VoiceConnectionOptions;

    /**
     * Initial audio source.
     *
     * May also be supplied later through `setSource()` or `play(source)`.
     */
    source?: AudioSource;

    /**
     * Milliseconds after which the manager reconnects and restarts playback.
     *
     * Set to `false` to disable renewal.
     *
     * @defaultValue `5_400_000`
     */
    renewIntervalMs?: number | false;

    /**
     * Maximum milliseconds to wait for the Discord voice connection to become ready.
     *
     * @defaultValue `20_000`
     */
    connectTimeoutMs?: number;

    /**
     * Optional inline volume configuration.
     */
    volume?: VolumeOptions;
};

/**
 * Internal normalized audio source passed to ffmpeg.
 */
export type ResolvedAudioSource = {
    /**
     * Validated URL or absolute file path passed as ffmpeg input.
     */
    input: string;

    /**
     * Original source configuration.
     */
    source: AudioSource;
};
