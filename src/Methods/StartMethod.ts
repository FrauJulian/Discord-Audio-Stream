const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require("@discordjs/voice");
const { join } = require("node:path");

import {startMethodOptions} from "../Utils/Options/StartMethodOptions";

export function startAudio({
    VoiceChannelID,
    GuildID,
    VoiceAdapter,
    ResourceType,
    Resource
}: startMethodOptions) {
    try {
        const AudioPlayer = createAudioPlayer();

        function streamFile(file: string) {
            let audioResource = createAudioResource(join(__dirname, file), { inlineVolume: true });
            AudioPlayer.play(audioResource);

            joinVoiceChannel({
                channelId: VoiceChannelID,
                guildId: GuildID,
                adapterCreator: VoiceAdapter
            }).subscribe(AudioPlayer);
        }

        function streamLink(link: string) {
            let audioResource = createAudioResource(link);
            AudioPlayer.play(audioResource);

            joinVoiceChannel({
                channelId: VoiceChannelID,
                guildId: GuildID,
                adapterCreator: VoiceAdapter
            }).subscribe(AudioPlayer)
        }

        switch (ResourceType) {
            case "Link":
                streamLink(Resource);
                break;
            case "File":
                streamFile(Resource);
                break;
            default:
                throw new TypeError("Audio type isn't valid.");
        }
    } catch (err) {
        console.error(err);
    }
}