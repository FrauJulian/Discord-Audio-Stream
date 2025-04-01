import {DiscordGatewayAdapterCreator, getVoiceConnection, joinVoiceChannel, VoiceConnection} from "@discordjs/voice";

export interface IConnectionManager {
    CreateConnection(connectionData: {
        VoiceChannelId: number;
        GuildId: number;
        VoiceAdapter: DiscordGatewayAdapterCreator;
    }): VoiceConnection;

    SetVolume(volume: number, guildId: bigint): VoiceConnection;

    SetMaxListeners(maxListeners: number, guildId: bigint): VoiceConnection;

    DestroyConnection(guildId: bigint): void;

    StopAudioOnConnection(guildId: bigint): VoiceConnection;

    ConnectAndPlayAudio(connectionData: {
        VoiceChannelId: number;
        GuildId: number;
        VoiceAdapter: DiscordGatewayAdapterCreator;
    }, audioData: {
        ResourceType: "Link" | "File";
        Resource: string;
    }): VoiceConnection;

    PlayAudioOnConnection(audioData: {
        ResourceType: "Link" | "File";
        Resource: string;
    }, guildId: bigint): VoiceConnection;
}