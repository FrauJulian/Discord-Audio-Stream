export interface VoiceAudioDataModel {
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