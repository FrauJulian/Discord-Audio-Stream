# Discord Audio Stream

[![npm](https://img.shields.io/npm/dw/discord-audio-stream)](http://npmjs.org/package/discord-audio-stream)
![GitHub package.json version](https://img.shields.io/github/package-json/v/FrauJulian/discord-audio-stream)
![GitHub Repo stars](https://img.shields.io/github/stars/FrauJulian/discord-audio-stream?style=social)

**This module is designed to work with [discord.js/voice](https://www.npmjs.com/package/@discordjs/voice) v0.18. This
package doesn't support older
versions!**

## 👋 Support

Please create an [issue](https://github.com/FrauJulian/DiscordAudioStreamNPM/issues) on github or write [
`fraujulian`](https://discord.com/users/860206216893693973) on discord!

## 📝 Usage

### Install

> **Supported package managers:** npm, yarn, pnpm, bun

#### Recommended:

```bash
npm install discord-audio-stream @snazzah/davey @discordjs/opus
yarn add discord-audio-stream @snazzah/davey @discordjs/opus
pnpm add discord-audio-stream @snazzah/davey @discordjs/opus
bun add discord-audio-stream @snazzah/davey @discordjs/opus
```

You need `@snazzah/davey` and one of the encryption libraries to run this package!

**Encryption Libraries (npm install):**

> You only need to install one of these libraries if your system does not support `aes-256-gcm` (verify by running
> `require('node:crypto').getCiphers().includes('aes-256-gcm')`).

- `sodium-native`
- `sodium`
- `@stablelib/xchacha20poly1305`
- `@noble/ciphers`
- `libsodium-wrappers`

**Opus Libraries (npm install):**

- `@discordjs/opus`
- `opusscript`

**FFmpeg:**

- [`FFmpeg`](https://ffmpeg.org/) (installed and added to environment)
- `ffmpeg-static`

### Create Instance

```js
let audioManager = new AudioManager();
```

or (with parameters)

```js
let audioManager = new AudioManager(
  {
    VoiceChannelId: 0, //voice channel id where to play music
    GuildId: 0, //guild id
    VoiceAdapter: 0, //guild VoiceAdapter
  },
  {
    ResourceType: '', //resource type like link or file
    Resource: '', //auto play link or file name
  },
);
```

### Properties of the AudioManager

#### Properties

| Callable with     | Type                         | Description                                     |
| ----------------- | ---------------------------- | ----------------------------------------------- |
| `VoiceConnection` | **VoiceConnection**          | VoiceConnection instance from discord.js/voice. |
| `AudioPlayer`     | **AudioPlayer**              | AudioPlayer instance from discord.js/voice.     |
| `AudioResource`   | **AudioResource**            | AudioResource instance from discord.js/voice.   |
| `ConnectionData`  | **VoiceConnectionDataModel** | Global variable for connection data.            |
| `AudioData`       | **AudioDataModel**           | Global variable for audio data.                 |

#### Methods

| Callable with                  | Parameters                                              | Return type | Description                                                   |                                        |
| ------------------------------ | ------------------------------------------------------- | ----------- | ------------------------------------------------------------- | -------------------------------------- |
| `OverrideVoiceConnectionData`  | `connectionData` (type of **VoiceConnectionDataModel**) | void        | Method to override global connectionData variable.            |                                        |
| `OverrideVoiceAudioDataModel`  | `audioData` (type of **VoiceAudioDataModel**)           | void        | Method to override global audioData variable.                 |                                        |
| `OverrideRenewInMs`            | `renewInMs` (type of int, default value is 5400000)     | void        | Method to override global renewInMs variable.                 |                                        |
| `CreateConnection`             | `isRenew` (type of boolean, default value is false)     | void        | Method to join the voice connection.                          |                                        |
| `PlayAudioOnConnection`        |                                                         | void        | Method to play audio on the existing voice connection.        |                                        |
| `PauseAudio`                   |                                                         | void        | Method to pause the audio.                                    |                                        |
| `ResumeAudio`                  |                                                         | void        | Method to resume the audio.                                   |                                        |
| `StopAudioOnConnection`        |                                                         | void        | Method to stop the audio without destroying voice connection. |                                        |
| `CreateConnectionAndPlayAudio` |                                                         | void        | Method to join the voice connection and play audio.           |                                        |
| `DestroyConnection`            |                                                         | void        | Method to destroy the voice connection.                       |                                        |
| `Dispose`                      |                                                         | void        | Dispose all data in object.                                   |                                        |
| `SetVolume`                    | `volume` (type of number, 0 - 100 percent)              | void        | Method to set the audio volume.                               | Method to set the volume of the audio. |
| `SetMaxListeners`              | `maxListeners` (type of number)                         | void        | Method to set the max listeners of the audio stream.          |                                        |

##### Types History

- [**VoiceConnection** by discord.js/voice](https://github.com/discordjs/discord.js/blob/main/packages/voice/src/VoiceConnection.ts#L166)
- [**AudioPlayer** by discord.js/voice](https://github.com/discordjs/discord.js/blob/main/packages/voice/src/audio/AudioPlayer.ts#L155)
- [**AudioResource** by discord.js/voice](https://github.com/discordjs/discord.js/blob/main/packages/voice/src/audio/AudioResource.ts#L44)
- [**VoiceConnectionDataModel** by discord-audio-stream](https://github.com/FrauJulian/Discord-Audio-Stream/blob/main/src/Models/VoiceConnectionDataModel.d.ts#L3)
- [**VoiceAudioDataModel** by discord-audio-stream](https://github.com/FrauJulian/Discord-Audio-Stream/blob/main/src/Models/VoiceAudioDataModel.d.ts#L1)

## 📋 Contributors:

~ [**FrauJulian - Julian Lechner**](https://fraujulian.xyz/).

## 🤝 Enjoy the package?

Give it a star ⭐ on [github](https://github.com/FrauJulian/discord-audio-stream)!
