const { getVoiceConnection } = require("@discordjs/voice");

import {maxListenerMethodOptions} from "../Utils/Options/MaxListenerMethodOptions";

export function setMaxAudioListeners({
    GuildID,
    MaxListeners
}: maxListenerMethodOptions) {
    try {
        let audioConnection = getVoiceConnection(GuildID);
        audioConnection.setMaxListeners(MaxListeners);
    } catch (err) {
        console.error(err);
    }
}