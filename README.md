# Discord Audio Stream

[![npm](https://img.shields.io/npm/dw/discord-audio-stream)](http://npmjs.org/package/discord-audio-stream)
![latest release](https://img.shields.io/badge/dynamic/json?label=release&query=$.name&url=https%3A%2F%2Fapi.github.com%2Frepos%2FFrauJulian%2Fdiscord-audio-stream%2Freleases%2Flatest&color=blue)
![GitHub Repo stars](https://img.shields.io/github/stars/FrauJulian/discord-audio-stream?style=social)

> **Designed for 24/7 Discord audio playback.**  
> `discord-audio-stream` is a small TypeScript library for managed Discord voice playback through
> `@discordjs/voice` and ffmpeg.

Discord voice streams need careful lifecycle handling. This package manages the voice connection, ffmpeg process,
raw PCM resource creation, optional reconnect renewal, and predictable cleanup so your bot code stays small and readable.

> **Recommended best practice:**  
> Keep one `AudioManager` per guild, usually in a `Map<string, AudioManager>`. Update the connection or source through
> `setConnection()` and `setSource()`, then call `start()`. When playback stops, call `stop()`. When the manager will not
> be reused, call `dispose()` to release timers, streams, ffmpeg, and the voice connection.

> **For large bots:**  
> Queue many simultaneous starts, for example with [`p-queue`](https://www.npmjs.com/package/p-queue), so the host does
> not spawn too many ffmpeg processes in the same tick.

## 👋 Support

Please create an [issue](https://github.com/FrauJulian/Discord-Audio-Stream/issues) on GitHub or contact
[`fraujulian`](https://discord.com/users/860206216893693973) on Discord.

## 📝 Usage

### Installation

**Node.js `22.22.3` or newer is required.**

Install the library and the required voice packages:

```bash
npm install discord-audio-stream @discordjs/voice prism-media @snazzah/davey opusscript
```

`libsodium-wrappers` is optional. Install it only when your runtime does not support `aes-256-gcm`:

```bash
node -e "console.log(require('node:crypto').getCiphers().includes('aes-256-gcm'))"
npm install libsodium-wrappers
```

For bundled ffmpeg support, install `ffmpeg-static` and use `ffmpeg.mode: 'static'`:

```bash
npm install ffmpeg-static
```

If ffmpeg is already available on the host PATH, use `ffmpeg.mode: 'native'`.

### AudioManager Example

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
    renewIntervalMs: 5_400_000,
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

## ⚙️ API

### Constructor

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
    volume?: {
        enabled?: boolean;
        initialPercent?: number;
    };
};
```

### Defaults

| Option             | Default     |
| ------------------ | ----------- |
| `ffmpeg.mode`      | `'native'`  |
| `connectTimeoutMs` | `20_000`    |
| `renewIntervalMs`  | `5_400_000` |
| `volume.enabled`   | `false`     |

### Methods

| Method                   | Description                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `setConnection(options)` | Replaces the voice connection target.                                              |
| `setSource(source)`      | Replaces the audio source.                                                         |
| `connect()`              | Joins the configured Discord voice channel.                                        |
| `play(source?)`          | Starts playback on an existing connection.                                         |
| `start()`                | Connects and starts playback.                                                      |
| `pause()`                | Pauses active playback.                                                            |
| `resume()`               | Resumes paused playback.                                                           |
| `stop()`                 | Stops playback, clears renewal, and destroys the voice connection.                 |
| `setVolume(percent)`     | Sets volume from `0` to `100`; requires `volume.enabled: true`.                    |
| `dispose()`              | Idempotently releases timers, ffmpeg, streams, player state, and voice connection. |

### State

```ts
manager.state; // 'idle' | 'connecting' | 'ready' | 'playing' | 'paused' | 'stopped' | 'disposed'
manager.isPlaying;
manager.isConnected;
```

## 🔊 Audio Options

### Volume

Inline volume has a runtime cost in `@discordjs/voice`, so it is disabled by default.

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

### ffmpeg Modes

- `mode: 'native'` uses the `ffmpeg` executable from the host environment.
- `mode: 'static'` resolves the optional `ffmpeg-static` package.
- `executablePath` overrides both modes and is useful for Docker images or custom ffmpeg builds.

Default output is raw Discord-compatible PCM: `s16le`, `48000 Hz`, `2 channels`.

You can override ffmpeg arguments through `ffmpeg.inputArgs` and `ffmpeg.outputArgs`. When you override them, you are
responsible for keeping the output compatible with `StreamType.Raw`.

### Renewal

By default, the manager schedules a renewal after `5_400_000 ms` so long-running streams can reconnect periodically.
Set `renewIntervalMs: false` to disable this behavior:

```ts
const manager = new AudioManager({
    connection,
    source,
    renewIntervalMs: false,
});
```

`stop()` and `dispose()` always clear the renewal timer.

## 🧯 Errors

The package exports these error classes:

- `AudioManagerError`
- `AudioManagerConfigError`
- `AudioManagerStateError`
- `FfmpegProcessError`

Configuration problems, such as a missing source or invalid URL, throw `AudioManagerConfigError`. Invalid lifecycle
operations, such as calling `pause()` while nothing is playing, throw `AudioManagerStateError`.

## 🧑‍💻 Development

```bash
npm ci
npm run check
npm run build
```

## 📋 Contributors

~ [**FrauJulian - Julian Lechner**](https://fraujulian.xyz/) - CODEOWNER

## 🤝 Enjoy the package?

Give it a star ⭐ on [GitHub](https://github.com/FrauJulian/discord-audio-stream)!
