const { getVoiceConnection } = require("@discordjs/voice");

import {stopMethodOptions} from "../Utils/Options/StopMethodOptions";

export function stopAudio({
    GuildID
}: stopMethodOptions) {
    try {
        let audioConnection = getVoiceConnection(GuildID);
        audioConnection.destroy();
    } catch (err) {
        console.error(err);
    }
}