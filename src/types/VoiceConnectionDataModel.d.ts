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
