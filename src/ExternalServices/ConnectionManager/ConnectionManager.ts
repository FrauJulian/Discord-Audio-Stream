import {DiscordGatewayAdapterCreator, getVoiceConnection, joinVoiceChannel, VoiceConnection} from "@discordjs/voice";
import {IConnectionManager} from "./IConnectionManager";
import {Constants} from "../../Core/Contants";

class ConnectionManager implements IConnectionManager {
    constructor() {
        if (Constants.DatabaseServices === null) throw Error("Database services were not initialized.");
    }

    CreateConnection(connectionData: {
        VoiceChannelId: number;
        GuildId: number;
        VoiceAdapter: DiscordGatewayAdapterCreator;
    }): VoiceConnection {
        return joinVoiceChannel({
            channelId: connectionData.VoiceChannelId.toString(),
            guildId: connectionData.GuildId.toString(),
            adapterCreator: connectionData.VoiceAdapter
        })
    }

    PlayAudioOnConnection(audioData: {
        ResourceType: "Link" | "File";
        Resource: string;
    }, guildId: bigint): VoiceConnection {
        throw new Error("Method not implemented.");
    }

    ConnectAndPlayAudio(connectionData: { VoiceChannelId: number; GuildId: number; VoiceAdapter: DiscordGatewayAdapterCreator; }, audioData: {
        ResourceType: "Link" | "File";
        Resource: string;
    }): VoiceConnection {
        throw new Error("Method not implemented.");
    }

    StopAudioOnConnection(guildId: bigint): VoiceConnection {
        let voiceConnection = getVoiceConnection(guildId.toString());
        if (!voiceConnection) throw new Error("Voice connection were not found.");

        //TODO: MAKE STOP AUDIO WITHOUT DESTROYING CONNECTION

        return voiceConnection;
    }

    DestroyConnection(guildId: bigint): void {
        let voiceConnection = getVoiceConnection(guildId.toString());
        if (!voiceConnection) throw new Error("Voice connection were not found.");

        voiceConnection.destroy();
    }

    SetMaxListeners(maxListeners: number, guildId: bigint): VoiceConnection {
        let voiceConnection = getVoiceConnection(guildId.toString());
        if (!voiceConnection) throw new Error("Voice connection were not found.");

        voiceConnection.setMaxListeners(maxListeners);

        return voiceConnection;
    }

    SetVolume(volume: number, guildId: bigint): VoiceConnection {
        if (volume < 0 || volume > 100) throw new Error("Volume must be between 0 and 100.");

        let voiceConnection = getVoiceConnection(guildId.toString());
        if (!voiceConnection) throw new Error("Voice connection were not found.");

        //TODO: MAKE VOLUME WORK

        return voiceConnection;
    }
}