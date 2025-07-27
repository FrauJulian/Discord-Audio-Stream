import type VoiceConnectionDataModel from "../Models/VoiceConnectionDataModel";
import type VoiceAudioDataModel from "../Models/VoiceAudioDataModel";

export default interface IAudioManager {
    OverrideOptions(connectionData?: VoiceConnectionDataModel | null, audioData?: VoiceAudioDataModel | null): void;

    CreateConnection(isRenew: boolean): void;

    PlayAudioOnConnection(): void;

    PauseAudio(): void;

    ResumeAudio(): void;

    StopAudioOnConnection(): void;

    CreateConnectionAndPlayAudio(): void;

    DestroyConnection(resetValidationParameters: boolean): void;

    SetVolume(volumeInPercent: number): void;

    SetMaxListeners(maxListeners: number): void;
}
