# Discord Audio Stream

[![npm](https://img.shields.io/npm/dw/discord-audio-stream)](https://www.npmjs.com/package/discord-audio-stream)
![latest release](https://img.shields.io/gitea/v/release/FrauJulian/Discord-Audio-Stream?gitea_url=https%3A%2F%2Fgit.lechner-systems.at&color=blue)
![Github Repo stars](https://img.shields.io/github/stars/FrauJulian/Discord-Audio-Stream?github_url=https%3A%2F%2Fgithub.com&style=social)

`discord-audio-stream` is a small TypeScript library for managed Discord voice playback through
`@discordjs/voice` and ffmpeg.

It manages the Discord voice connection, ffmpeg process, raw PCM audio resource, optional renewal, and cleanup. Keep one
`AudioManager` per guild, usually in a `Map<string, AudioManager>`, and call `dispose()` when that manager will not be
reused.

## Support

Create an [issue](https://git.lechner-systems.at/FrauJulian/Discord-Audio-Stream/issues) on Gitea or contact
[`fraujulian`](https://discord.com/users/860206216893693973) on Discord.

## Installation

Node.js `>=22.12.0` and `<25` is required.

```bash
npm install discord-audio-stream @discordjs/voice @discordjs/opus
```

Use `opusscript@^0.0.8` only as a slower JavaScript fallback when `@discordjs/opus` cannot be installed.

`ffmpeg` must be available either on the host PATH or through the optional `ffmpeg-static` package:

```bash
npm install ffmpeg-static
```

Use `ffmpeg.mode: 'native'` for PATH-based ffmpeg and `ffmpeg.mode: 'static'` for `ffmpeg-static`.

## Basic Usage

```ts
import { AudioManager } from 'discord-audio-stream';

const manager = new AudioManager({
    connection: {
        guildId: guild.id,
        channelId: voiceChannel.id,
        adapterCreator: guild.voiceAdapterCreator,
    },
    source: {
        type: 'url',
        url: 'https://example.com/live-stream.mp3',
    },
    ffmpeg: {
        mode: 'native',
    },
});

await manager.start();
```

For a file source:

```ts
manager.setSource({
    type: 'file',
    path: 'audio/intro.mp3',
});

await manager.start();
```

Relative file paths are resolved from `process.cwd()`. URL sources are validated before playback starts.

For large bots, queue many simultaneous starts so the host does not spawn too many ffmpeg processes in the same tick.

## Lifecycle

```ts
manager.setConnection(connectionOptions);
manager.setSource(source);

await manager.start(); // connect() + play()
manager.pause();
manager.resume();
await manager.stop(); // stops playback and destroys the voice connection
manager.dispose(); // final cleanup; the manager cannot be reused
```

`connect()` joins the configured voice channel. `play(source?)` starts playback on an existing connection. Use `start()`
when you want both.

For scoped playback, `AudioManager` supports explicit resource management:

```ts
{
    using manager = new AudioManager(options);
    await manager.start();
} // disposed automatically
```

## API

```ts
type AudioManagerOptions = {
    ffmpeg?: {
        mode?: 'native' | 'static';
        executablePath?: string;
        inputArgs?: readonly string[];
        outputArgs?: readonly string[];
    };
    connection?: {
        guildId: string;
        channelId: string;
        adapterCreator: DiscordGatewayAdapterCreator;
    };
    source?: { type: 'url'; url: string } | { type: 'file'; path: string };
    renewIntervalMs?: number | false;
    connectTimeoutMs?: number;
    onError?: (error: Error) => void;
    volume?: {
        enabled?: boolean;
        initialPercent?: number;
    };
};
```

`connectTimeoutMs` and numeric `renewIntervalMs` values must be whole milliseconds from `1` through `2_147_483_647`.
`volume.initialPercent` must be a finite number from `0` through `100` and requires `volume.enabled: true`.

### Defaults

| Option             | Default    |
| ------------------ | ---------- |
| `ffmpeg.mode`      | `'native'` |
| `connectTimeoutMs` | `20_000`   |
| `renewIntervalMs`  | `false`    |
| `volume.enabled`   | `false`    |

### Methods

| Method                   | Description                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `setConnection(options)` | Sets the target for the next `connect()` or `start()` call.                        |
| `setSource(source)`      | Sets the source for the next `play()` or `start()` call.                           |
| `connect()`              | Joins the configured Discord voice channel.                                        |
| `play(source?)`          | Starts playback on an existing connection.                                         |
| `start()`                | Connects and starts playback.                                                      |
| `pause()`                | Pauses active playback.                                                            |
| `resume()`               | Resumes paused playback.                                                           |
| `stop()`                 | Stops playback, clears renewal, and destroys the voice connection.                 |
| `setVolume(percent)`     | Sets volume from `0` to `100`; requires `volume.enabled: true`.                    |
| `dispose()`              | Idempotently releases timers, ffmpeg, streams, player state, and voice connection. |
| `[Symbol.dispose]()`     | Enables automatic cleanup with TypeScript's `using` declaration.                   |

### State

```ts
manager.state; // 'idle' | 'connecting' | 'ready' | 'playing' | 'paused' | 'stopped' | 'disposed'
manager.isPlaying;
manager.isConnected;
```

## Audio Options

Inline volume has runtime cost in `@discordjs/voice`, so it is disabled by default.

```ts
const manager = new AudioManager({
    connection,
    source,
    volume: {
        enabled: true,
        initialPercent: 50,
    },
});

await manager.start();
manager.setVolume(25);
```

Calling `setVolume()` without `volume.enabled: true` throws `AudioManagerStateError`.

Default ffmpeg output is raw Discord-compatible PCM: `s16le`, `48000 Hz`, `2 channels`.

You can override ffmpeg arguments through `ffmpeg.inputArgs` and `ffmpeg.outputArgs`. When you override them, you are
responsible for keeping the output compatible with `StreamType.Raw`.

Connection renewal is disabled by default because `@discordjs/voice` handles recoverable disconnects. Set
`renewIntervalMs` only when an application has a measured need for periodic restarts. `stop()` and `dispose()` always
clear the renewal timer.

## Errors

The package exports these error classes:

- `AudioManagerError`
- `AudioManagerConfigError`
- `AudioManagerStateError`
- `FfmpegProcessError`

Configuration problems, such as a missing source or invalid URL, throw `AudioManagerConfigError`. Invalid lifecycle
operations, such as calling `pause()` while nothing is playing, throw `AudioManagerStateError`.

Use `onError` to observe asynchronous audio player and voice connection errors. The manager cleans up failed playback
and unrecoverable connections before invoking the callback.

`onError` does not handle rejected `connect()`, `play()`, or `start()` calls. Await and catch those calls explicitly.

## Development

```bash
npm ci
npm run check
npm run build
```

## Contributors

~ [**FrauJulian - Julian Lechner**](https://fraujulian.xyz/) - CODEOWNER

## Enjoy the package?

Give it a star on [Gitea](https://git.lechner-systems.at/FrauJulian/Discord-Audio-Stream)!
