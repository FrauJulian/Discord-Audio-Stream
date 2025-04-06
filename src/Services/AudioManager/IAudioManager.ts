import {VoiceConnection} from "@discordjs/voice";
import {VoiceAudioDataModel} from "../../Models/VoiceAudioDataModel";
import {VoiceConnectionDataModel} from "../../Models/VoiceConnectionDataModel";

export interface IAudioManager {
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