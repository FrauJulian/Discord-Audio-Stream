const {getVoiceConnection} = require("@discordjs/voice");

import {stopMethodOptions} from "../Utils/Options/StopMethodOptions";

export function stopAudio({
                              GuildID
                          }: stopMethodOptions) {
    let audioConnection = getVoiceConnection(GuildID);
    audioConnection.destroy();
}