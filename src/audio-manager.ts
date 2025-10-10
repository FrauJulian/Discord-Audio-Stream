import type { AudioPlayer, AudioResource, VoiceConnection } from '@discordjs/voice';
import { createAudioPlayer, createAudioResource, joinVoiceChannel } from '@discordjs/voice';
import { join } from 'node:path';
import type { VoiceAudioDataModel, VoiceConnectionDataModel } from './index.d';

export default class AudioManager {
  public VoiceConnection?: VoiceConnection;
  public AudioPlayer?: AudioPlayer;
  public AudioResource?: AudioResource;

  protected IsActive?: boolean;
  protected IsAudioPlaying?: boolean;

  protected ConnectionData?: VoiceConnectionDataModel;
  protected AudioData?: VoiceAudioDataModel;

  private TimeoutHandle?: NodeJS.Timeout;
  private RenewInMs?: number;

  constructor(connectionData?: VoiceConnectionDataModel, audioData?: VoiceAudioDataModel, renewInMs = 5400000) {
    this.RenewInMs = renewInMs;
    this.ConnectionData = connectionData;
    this.AudioData = audioData;
  }

  public OverrideRenewInMs(renewInMs: number = 5400000): void {
    this.RenewInMs = renewInMs;
  }

  public OverrideVoiceConnectionData(connectionData: VoiceConnectionDataModel): void {
    this.ConnectionData = connectionData;
  }

  public OverrideVoiceAudioDataModel(audioData: VoiceAudioDataModel): void {
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
      adapterCreator: this.ConnectionData!.VoiceAdapter,
    });

    this.TimeoutHandle = setTimeout((): void => {
      this.DestroyConnection(false);
      if (this.IsActive) {
        this.CreateConnection(true);

        if (this.IsAudioPlaying) {
          this.PlayAudioOnConnection();
        }
      }
    }, this.RenewInMs);
  }

  public PlayAudioOnConnection(): void {
    this.CheckIfNull(this.AudioData);

    if (this.AudioData!.ResourceType === 'File') {
      this.AudioResource = createAudioResource(join(__dirname, this.AudioData!.Resource), { inlineVolume: true });
    } else if (this.AudioData!.ResourceType === 'Link') {
      this.AudioResource = createAudioResource(this.AudioData!.Resource, { inlineVolume: true });
    } else {
      throw new Error('Invalid resource type.');
    }

    this.AudioPlayer = createAudioPlayer();
    this.AudioPlayer.play(this.AudioResource);

    this.VoiceConnection!.subscribe(this.AudioPlayer!);
    this.IsAudioPlaying = true;
  }

  public StopAudioOnConnection(): void {
    if (this.IsAudioPlaying) {
      this.DestroyConnection(false);
      this.CreateConnection();
    } else {
      throw new Error('Audio is not playing.');
    }
  }

  public PauseAudio(): void {
    if (this.IsAudioPlaying) {
      this.AudioPlayer!.pause();
      this.IsAudioPlaying = false;
    } else {
      throw new TypeError('Audio is not playing.');
    }
  }

  public ResumeAudio(): void {
    if (!this.IsAudioPlaying) {
      this.AudioPlayer!.unpause();
      this.IsAudioPlaying = true;
    } else {
      throw new TypeError('Audio is playing.');
    }
  }

  public CreateConnectionAndPlayAudio(): void {
    this.CreateConnection();
    this.PlayAudioOnConnection();
  }

  public DestroyConnection(resetValidationParameters: boolean = true): void {
    if (this.CheckIfNull(this.VoiceConnection)) return;
    this.VoiceConnection!.destroy();

    if (resetValidationParameters) {
      this.IsActive = false;
      this.IsAudioPlaying = false;
    }
  }

  public SetMaxListeners(maxListeners: number): void {
    if (this.CheckIfNull(this.VoiceConnection)) return;
    this.VoiceConnection!.setMaxListeners(maxListeners);
  }

  public SetVolume(volumeInPercent: number): void {
    if (volumeInPercent < 0 || volumeInPercent > 100) throw new Error('Volume must be between 0 and 100.');

    if (this.CheckIfNull(this.VoiceConnection)) return;

    this.AudioResource!.volume!.setVolume(volumeInPercent / 100);
  }

  public Dispose(): void {
    this.VoiceConnection = undefined;
    this.AudioPlayer = undefined;
    this.AudioResource = undefined;
    this.IsActive = undefined;
    this.IsAudioPlaying = undefined;
    this.ConnectionData = undefined;
    this.AudioData = undefined;
    this.TimeoutHandle = undefined;
    this.RenewInMs = undefined;
  }

  private CheckIfNull<T>(value: T | null): boolean {
    if (value === null) {
      throw new Error(`${value} cannot be null in this case.`);
    }

    return true;
  }
}
