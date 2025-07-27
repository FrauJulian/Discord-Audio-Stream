import {
    AudioPlayer,
    AudioResource,
    createAudioPlayer,
    createAudioResource,
    joinVoiceChannel,
    VoiceConnection
} from "@discordjs/voice";
import type IAudioManager from "./IAudioManager";
import type VoiceConnectionDataModel from "../Models/VoiceConnectionDataModel";
import type VoiceAudioDataModel from "../Models/VoiceAudioDataModel";
import {join} from "node:path";

export default class AudioManager implements IAudioManager {
    public VoiceConnection: VoiceConnection | null = null;
    public AudioPlayer: AudioPlayer | null = null;
    public AudioResource: AudioResource | null = null;

    protected IsActive: boolean = false;
    protected IsAudioPlaying: boolean = false;

    protected ConnectionData: VoiceConnectionDataModel | null;
    protected AudioData: VoiceAudioDataModel | null;

    constructor(connectionData: VoiceConnectionDataModel | null = null, audioData: VoiceAudioDataModel | null = null) {
        this.ConnectionData = connectionData;
        this.AudioData = audioData;
    }

    public OverrideOptions(connectionData: VoiceConnectionDataModel | null = null, audioData: VoiceAudioDataModel | null = null): void {
        this.ConnectionData = connectionData;
        this.AudioData = audioData;
    }

    public CreateConnection(isRenew: boolean = false): void {
        this.CheckIfNull(this.ConnectionData);

        if (!isRenew) {
            if (this.IsActive) {
                this.DestroyConnection(false);
            } else {
                this.IsActive = true;
            }
        }

        this.VoiceConnection = joinVoiceChannel({
            channelId: this.ConnectionData!.VoiceChannelId.toString(),
            guildId: this.ConnectionData!.GuildId.toString(),
            adapterCreator: this.ConnectionData!.VoiceAdapter
        });

        setTimeout((): void => {
            this.RenewConnectionAndAudio();
        }, 5400000);
    }

    public PlayAudioOnConnection(): void {
        this.CheckIfNull(this.AudioData);

        if (this.AudioData!.ResourceType === "File") {
            this.AudioResource = createAudioResource(join(__dirname, this.AudioData!.Resource), {inlineVolume: true});
        } else if (this.AudioData!.ResourceType === "Link") {
            this.AudioResource = createAudioResource(this.AudioData!.Resource, {inlineVolume: true});
        } else {
            throw new Error("Invalid resource type.");
        }

        this.AudioPlayer = createAudioPlayer();
        this.AudioPlayer.play(this.AudioResource);

        this.VoiceConnection!.subscribe(this.AudioPlayer!);
        this.IsAudioPlaying = true;
    }

    public StopAudioOnConnection(): void {
        if (this.IsAudioPlaying) {
            this.DestroyConnection(false)
            this.CreateConnection();
        } else {
            throw new Error("Audio is not playing.");
        }

    }

    public PauseAudio(): void {
        this.CheckIfNull(this.AudioPlayer);
        this.AudioPlayer!.pause();
    }

    public ResumeAudio(): void {
        this.CheckIfNull(this.AudioPlayer);
        this.AudioPlayer!.unpause();
    }

    public CreateConnectionAndPlayAudio(): void {
        this.CreateConnection();
        this.PlayAudioOnConnection();
    }

    public DestroyConnection(resetValidationParameters: boolean = true): void {
        this.CheckIfNull(this.VoiceConnection);
        this.VoiceConnection!.destroy();

        if (resetValidationParameters) {
            this.IsActive = false;
            this.IsAudioPlaying = false;
        }
    }

    public SetMaxListeners(maxListeners: number): void {
        this.CheckIfNull(this.VoiceConnection);
        this.VoiceConnection!.setMaxListeners(maxListeners);
    }

    public SetVolume(volumeInPercent: number): void {
        if (volumeInPercent < 0 || volumeInPercent > 100) throw new Error("Volume must be between 0 and 100.");
        this.AudioResource!.volume!.setVolume(volumeInPercent / 100);
    }

    private RenewConnectionAndAudio(): void {
        this.DestroyConnection(false);
        if (this.IsActive) {
            this.CreateConnection(true);

            if (this.IsAudioPlaying) {
                this.PlayAudioOnConnection();
            }
        }
    }

    private CheckIfNull<T>(value: T | null): boolean {
        if (value === null) {
            throw new Error(`${value} cannot be null in this case.`);
        }

        return true;
    }
}
