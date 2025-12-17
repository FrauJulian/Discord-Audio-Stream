# Discord Audio Stream

[![npm](https://img.shields.io/npm/dw/discord-audio-stream)](http://npmjs.org/package/discord-audio-stream)
![GitHub package.json version](https://img.shields.io/github/package-json/v/FrauJulian/discord-audio-stream)
![GitHub Repo stars](https://img.shields.io/github/stars/FrauJulian/discord-audio-stream?style=social)

**This module is designed to work with [discord.js/voice](https://www.npmjs.com/package/@discordjs/voice) v0.19. This
package doesn't support older
versions!**

> **Designed for 24/7 audio playing on discord.**  
> Discord has many unwanted rate limits, especially in the audio area. This package does all the work and ensures that
> your music never stops playing due to ffmpeg or Discord, with as little effort as possible.

> **Recommended best Practise:**  
> Create a global Map<GuildId, AudioManager> (Map<KEY, OBJ>) list. When the feature is used on a guild, add a new
> instance of AudioManager to the Map. When starting the connection or audio, overwrite the respective configuration with
> the override methods provided. To finally start, use the respective method. For each call and each change, retrieve the
> AudioManager object from the list and perform your actions. When the feature get stopped, first execute StopConnection
> and then Dispose to save as much power as possible. Garbage collection does the rest.  
> **For large features:** For large systems, it is recommended to queue each start with the
> packet [p-queue](https://www.npmjs.com/package/p-queue), to give ffmpeg enough time..

## 👋 Support

Please create an [issue](https://github.com/FrauJulian/DiscordAudioStreamNPM/issues) on github or write [
`fraujulian`](https://discord.com/users/860206216893693973) on discord!

## 📝 Usage

### Installation

**Node.js 22.12.0 or newer is required.**

```bash
npm install discord-audio-stream
yarn add discord-audio-stream
pnpm add discord-audio-stream
bun add discord-audio-stream
```

#### Required Dependencies

- > You only need to install [`libsodium-wrappers`](https://www.npmjs.com/package/libsodium-wrappers) if your system does not support `aes-256-gcm` (verify by running `require('node:crypto').getCiphers().includes('aes-256-gcm')`).
- [`@snazzah/davey`](https://www.npmjs.com/package/@snazzah/davey)
- [`opusscript`](https://www.npmjs.com/package/opusscript)
- [`prism-media`](https://www.npmjs.com/package/prism-media)
- [@discordjs/voice](https://www.npmjs.com/package/@discordjs/voice)
- **FFmpeg** (one of those)
    - [`FFmpeg`](https://ffmpeg.org/) (environment) - *recommended*
    - [`FFmpeg-static`](https://www.npmjs.com/package/ffmpeg-static) (library)

### AudioManager Instance

#### Constructor

```
AudioManager(ffmpegMode: string, renewInMs, number, connectionData: VoiceConnectionDataModel, audioData: VoiceAudioDataModel): IDisposable, IAudioManager
```

- `ffmpegMode`: 'Native' or 'Standalone'
    - Native: [`FFmpeg`](https://ffmpeg.org/) (environment)
    - Standalone: [`FFmpeg-static`](https://www.npmjs.com/package/ffmpeg-static) (library)
- `renewInMs`: renewal time, default 1,5h = 5400000ms  - optional
- `connectionData`: options for voice connection - optional
- `audioData`: options for audio player - optional

#### Example

```js
let audioManager = new AudioManager(
    'Native',
    5400000,
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

### Fields and Methods of AudioManager

#### Fields

| Name      | Type     | Security  | Description                           |
| --------- | -------- | --------- | ------------------------------------- |
| `Active`  | **bool** | protected | To check if the connection is active. |
| `Playing` | **bool** | protected | To check if it is playing audio.      |

#### Methods

| Name                          | Parameters                                              | Return type   | Description                              |
| ----------------------------- | ------------------------------------------------------- | ------------- | ---------------------------------------- |
| `OverrideVoiceConnectionData` | `connectionData`: **VoiceConnectionDataModel**          | void          | To override intern connectionData field. |
| `OverrideVoiceAudioDataModel` | `audioData`: **VoiceAudioDataModel**                    | void          | To override intern audioData field.      |
| `CreateAndPlay`               |                                                         | Promise void  | Join channel and start playing audio.    |
| `CreateConnection`            |                                                         | void          | Let it connect to voice channel.         |
| `PlayAudio`                   |                                                         | Promise void  | To start playing audio.                  |
| `PauseAudio`                  |                                                         | void          | Pause the audio, if it is playing        |
| `ResumeAudio`                 |                                                         | void          | Resume the audio, if it is paused.       |
| `SetVolume`                   | `volume`: number (0 - 100 percent)                      | void          | To set the audio volume.                 |
| `StopConnection`              |                                                         | Promise void  | Method to disconnect the voice channel.  |
| `Dispose`                     |                                                         | void          | Dispose all data in object.              |

## 📝 Types

- [**VoiceConnection** by discord.js/voice](https://github.com/discordjs/discord.js/blob/main/packages/voice/src/VoiceConnection.ts#L166)
- [**AudioPlayer** by discord.js/voice](https://github.com/discordjs/discord.js/blob/main/packages/voice/src/audio/AudioPlayer.ts#L155)
- [**AudioResource** by discord.js/voice](https://github.com/discordjs/discord.js/blob/main/packages/voice/src/audio/AudioResource.ts#L44)
- [**DiscordGatewayAdapterCreator** by discord.js/voice](https://github.com/discordjs/discord.js/blob/main/packages/voice/src/util/adapter.ts#L50)
- [**VoiceConnectionDataModel** by discord-audio-stream](https://github.com/FrauJulian/Discord-Audio-Stream/blob/master/src/types.d.ts#L3)
- [**VoiceAudioDataModel** by discord-audio-stream](https://github.com/FrauJulian/Discord-Audio-Stream/blob/master/src/types.d.ts#L21)
- [**IDisposable** by discord-audio-stream](https://github.com/FrauJulian/Discord-Audio-Stream/blob/master/src/types.d.ts#L38)
- [**IAudioManager** by discord-audio-stream](https://github.com/FrauJulian/Discord-Audio-Stream/blob/master/src/types.d.ts#L45)

## 📋 Contributors:

~ [**FrauJulian - Julian Lechner**](https://fraujulian.xyz/) - CODEOWNER

## 🤝 Enjoy the package?

Give it a star ⭐ on [github](https://github.com/FrauJulian/discord-audio-stream)!
