import type {DiscordGatewayAdapterCreator} from "@discordjs/voice";

export default interface VoiceConnectionDataModel {
    /**
     * The ID of the voice channel to connect to.
     */
    VoiceChannelId: number;

    /**
     * The Id of the guild (server) to connect to.
     */
    GuildId: number;

    /**
     * The adapter creator for the voice connection.
     * Can be archived by the guild instance via the voiceAdapterCreator property.
     */
    VoiceAdapter: DiscordGatewayAdapterCreator;
}
