import type {DiscordGatewayAdapterCreator} from "@discordjs/voice";

export type VoiceConnectionDataModel = {
    /**
     * The ID of the voice channel to connect to.
     */
    VoiceChannelId: string;

    /**
     * The Id of the guild (server) to connect to.
     */
    GuildId: string;

    /**
     * The adapter creator for the voice connection.
     * Can be archived by the guild instance via the voiceAdapterCreator property.
     */
    VoiceAdapter: DiscordGatewayAdapterCreator;
}

export type VoiceAudioDataModel = {
    /**
     * The unique identifier for the audio resource.
     */
    ResourceType: "Link" | "File";

    /**
     * The URL or file path of the audio resource.
     * any is to be assumed to require(filepath)
     */
    Resource: string | any;
}
