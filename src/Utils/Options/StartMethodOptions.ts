export type startMethodOptions = {
    VoiceChannelID: number;
    GuildID: number;
    VoiceAdapter: number;
    ResourceType: "Link" | "File";
    Resource: string;
};