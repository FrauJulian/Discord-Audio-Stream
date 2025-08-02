import {
    AudioPlayer,
    AudioResource,
    createAudioPlayer,
    createAudioResource,
    joinVoiceChannel,
    VoiceConnection
} from "@discordjs/voice";
import {join} from "node:path";
import {VoiceConnectionDataModel} from "./types/VoiceConnectionDataModel";
import {VoiceAudioDataModel} from "./types/VoiceAudioDataModel";

export default class AudioManager {
    public VoiceConnection?: VoiceConnection = undefined;
    public AudioPlayer?: AudioPlayer = undefined;
    public AudioResource?: AudioResource = undefined;

    protected IsActive?: boolean = undefined;
    protected IsAudioPlaying?: boolean = undefined;

    protected ConnectionData?: VoiceConnectionDataModel;
    protected AudioData?: VoiceAudioDataModel;

    private TimeoutHandle?: NodeJS.Timeout;
    private RenewInMs?: number;

    constructor(connectionData?: VoiceConnectionDataModel, audioData?: VoiceAudioDataModel, renewInMs = 5400000) {
        this.RenewInMs = renewInMs;
        this.ConnectionData = connectionData;
        this.AudioData = audioData;
    }

    public OverrideOptions(connectionData?: VoiceConnectionDataModel, audioData?: VoiceAudioDataModel, renewInMs = 5400000): void {
        this.RenewInMs = renewInMs;
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

        this.TimeoutHandle = setTimeout((): void => {
            this.RenewConnectionAndAudio();
        }, this.RenewInMs);
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
        if (this.IsAudioPlaying) {
            this.AudioPlayer!.pause();
            this.IsAudioPlaying = false;
        } else {
            throw new TypeError("Audio is not playing.");
        }
    }

    public ResumeAudio(): void {
        if (!this.IsAudioPlaying) {
            this.AudioPlayer!.unpause();
            this.IsAudioPlaying = true;
        } else {
            throw new TypeError("Audio is playing.");
        }
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
        this.VoiceConnection!.setMaxListeners(maxListeners);
    }

    public SetVolume(volumeInPercent: number): void {
        if (volumeInPercent < 0 || volumeInPercent > 100) throw new Error("Volume must be between 0 and 100.");
        this.CheckIfNull(this.VoiceConnection);
        this.AudioResource!.volume!.setVolume(volumeInPercent / 100);
    }

    public Dispose(): void {
        if (this.IsActive != undefined) {
            this.DestroyConnection();
            this.ConnectionData = undefined;
            this.VoiceConnection = undefined;
        }

        if (this.IsAudioPlaying != undefined) {
            this.AudioData = undefined;
            this.AudioResource = undefined;
            this.AudioPlayer = undefined;
        }

        if (this.TimeoutHandle) {
            clearTimeout(this.TimeoutHandle);
            this.TimeoutHandle = undefined;
        }
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
