import type { AudioPlayer, AudioResource, VoiceConnection } from '@discordjs/voice';
import {
    createAudioPlayer,
    createAudioResource,
    entersState,
    joinVoiceChannel,
    NoSubscriberBehavior,
    StreamType,
    VoiceConnectionStatus,
} from '@discordjs/voice';
import { join } from 'node:path';
import type { IAudioManager, IDisposable, VoiceAudioDataModel, VoiceConnectionDataModel } from './types';
import { spawn } from 'node:child_process';
import type { Readable } from 'node:stream';

export default class AudioManager implements IAudioManager, IDisposable {
    private voiceConnection?: VoiceConnection | null;
    private audioPlayer?: AudioPlayer | null;
    private audioResource?: AudioResource | null;

    protected Active?: boolean | null;
    protected Playing?: boolean | null;

    private timeout?: NodeJS.Timeout | null;
    private ffmpegProcess?: ReturnType<typeof spawn> | null;
    private pcmStream?: Readable | null;

    constructor(
        private readonly ffmpegMode: 'Native' | 'Standalone',
        private renewMs: number | null = null,
        private connectionData: VoiceConnectionDataModel | null = null,
        private audioData: VoiceAudioDataModel | null = null,
    ) {
        this.renewMs = renewMs ? renewMs : 5400000;
    }

    public OverrideVoiceConnectionData(connectionData: VoiceConnectionDataModel): void {
        this.connectionData = connectionData;
    }

    public OverrideVoiceAudioDataModel(audioData: VoiceAudioDataModel): void {
        this.audioData = audioData;
    }

    public CreateConnection(): void {
        this.voiceConnection = joinVoiceChannel({
            channelId: this.connectionData!.VoiceChannelId,
            guildId: this.connectionData!.GuildId,
            adapterCreator: this.connectionData!.VoiceAdapter,
        });

        this.timeout = setTimeout(async (): Promise<void> => {
            await this.StopConnection();
            await this.CreateAndPlay();
        }, this.renewMs!);
    }

    public async PlayAudio(): Promise<void> {
        if (!this.audioData || !this.voiceConnection) return;

        await entersState(this.voiceConnection!, VoiceConnectionStatus.Ready, 20_000);

        if (this.ffmpegProcess) {
            this.ffmpegProcess.kill('SIGKILL');
            this.ffmpegProcess = null;
        }

        let source: string;

        if (this.audioData!.ResourceType === 'File') {
            source = join(__dirname, this.audioData!.Resource);
        } else if (this.audioData!.ResourceType === 'Link') {
            source = this.audioData!.Resource;
        } else {
            throw new TypeError('Invalid resource type.');
        }

        this.ffmpegProcess = spawn(
            this.ffmpegMode === 'Native' ? 'ffmpeg' : require('ffmpeg-static'),
            [
                '-loglevel',
                'error',
                '-i',
                source,
                '-analyzeduration',
                '0',
                '-f',
                's16le',
                '-ar',
                '48000',
                '-ac',
                '2',
                'pipe:1',
            ],
            {
                stdio: ['ignore', 'pipe', 'pipe'],
            },
        );

        this.pcmStream = this.ffmpegProcess!.stdout as Readable;

        this.audioResource = createAudioResource(this.pcmStream, {
            inputType: StreamType.Raw,
            inlineVolume: true,
        });

        this.audioPlayer = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Play,
            },
        });

        this.voiceConnection!.subscribe(this.audioPlayer);

        this.audioPlayer.play(this.audioResource);
        this.Playing = true;
    }

    public PauseAudio(): void {
        if (this.Playing) {
            this.audioPlayer!.pause();
            this.Playing = false;
        } else {
            throw new ReferenceError('Audio is not playing.');
        }
    }

    public ResumeAudio(): void {
        if (!this.Playing) {
            this.audioPlayer!.unpause();
            this.Playing = true;
        } else {
            throw new ReferenceError('Audio is playing.');
        }
    }

    public async CreateAndPlay(): Promise<void> {
        this.CreateConnection();
        await this.PlayAudio();
    }

    public async StopConnection(): Promise<void> {
        this.voiceConnection?.disconnect();
        this.voiceConnection?.destroy();
        this.voiceConnection = null;

        this.Active = false;
        this.Playing = false;
    }

    public SetVolume(volumeInPercent: number): void {
        if (volumeInPercent < 0 || volumeInPercent > 100) throw new Error('Volume must be between 0 and 100.');
        this.audioResource!.volume!.setVolume(volumeInPercent / 100);
    }

    public Dispose(): void {
        try {
            if (this.timeout) {
                clearTimeout(this.timeout);
            }

            if (this.audioPlayer) {
                this.audioPlayer.stop(true);
            }

            if (this.audioPlayer) {
                this.audioPlayer!.stop();

                if (this.audioResource && this.audioResource.playStream) {
                    this.audioResource!.playStream.destroy();
                }
            }

            if (this.voiceConnection) {
                this.voiceConnection!.destroy();
            }

            if (this.ffmpegProcess) {
                this.ffmpegProcess.kill('SIGKILL');
                this.ffmpegProcess = null;
            }

            this.pcmStream?.destroy();
            this.pcmStream = null;

            this.audioPlayer = null;
            this.audioResource = null;
            this.voiceConnection = null;
            this.timeout = null;
            this.Active = null;
            this.Playing = null;
            this.connectionData = null;
            this.audioData = null;
            this.renewMs = null;
        } catch {}
    }
}
