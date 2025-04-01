const {
    joinVoiceChannel, createAudioPlayer, createAudioResource} = require("@discordjs/voice");
const {join} = require("node:path");

import {startMethodOptions} from "../Utils/Options/StartMethodOptions";

export function startAudio({
                               VoiceChannelID,
                               GuildID,
                               VoiceAdapter,
                               ResourceType,
                               Resource
                           }: startMethodOptions) {
    let audioPlayer = createAudioPlayer();

    function streamFile(file: string) {
        let audioResource = createAudioResource(join(__dirname, file), {inlineVolume: true});
        audioPlayer.play(audioResource);

        joinVoiceChannel({
            channelId: VoiceChannelID,
            guildId: GuildID,
            adapterCreator: VoiceAdapter
        }).subscribe(audioPlayer);
    }

    function streamLink(link: string) {
        let audioResource = createAudioResource(link);
        audioPlayer.play(audioResource);

        joinVoiceChannel({
            channelId: VoiceChannelID,
            guildId: GuildID,
            adapterCreator: VoiceAdapter
        }).subscribe(audioPlayer)
    }

    switch (ResourceType) {
        case "Link":
            streamLink(Resource);
            break;
        case "File":
            streamFile(Resource);
            break;
        default:
            throw new TypeError("Invalid audio type");
    }
}