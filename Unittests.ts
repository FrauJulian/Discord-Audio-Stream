// Jest unit tests for the AudioManager class focusing on functionality and performance

import AudioManager from './src/audioManager'
import { performance } from 'node:perf_hooks'

// Mocking @discordjs/voice
jest.mock('@discordjs/voice', () => {
    return {
        joinVoiceChannel: jest.fn(() => ({
            subscribe: jest.fn(),
            destroy: jest.fn(),
            setMaxListeners: jest.fn()
        })),
        createAudioPlayer: jest.fn(() => ({
            play: jest.fn(),
            pause: jest.fn(),
            unpause: jest.fn()
        })),
        createAudioResource: jest.fn(() => ({
            volume: { setVolume: jest.fn() }
        }))
    }
})

type VoiceConnectionDataModel = {
    VoiceChannelId: string
    GuildId: string
    VoiceAdapter: any
}

type VoiceAudioDataModel = {
    ResourceType: 'Link' | 'File'
    Resource: string | any
}

const connectionData: VoiceConnectionDataModel = {
    VoiceChannelId: '1',
    GuildId: '1',
    VoiceAdapter: jest.fn()
}

const audioDataFile: VoiceAudioDataModel = {
    ResourceType: 'File',
    Resource: 'sound.mp3'
}

const audioDataLink: VoiceAudioDataModel = {
    ResourceType: 'Link',
    Resource: 'https://example.com/sound.mp3'
}

describe('AudioManager', () => {
    beforeEach(() => jest.clearAllMocks())

    test('CreateConnection initializes voice connection', () => {
        const manager = new AudioManager(connectionData, audioDataFile)
        const start = performance.now()
        manager.CreateConnection()
        const duration = performance.now() - start
        expect(require('@discordjs/voice').joinVoiceChannel).toHaveBeenCalled()
        expect(duration).toBeLessThan(50)
    })

    test('PlayAudioOnConnection loads file resource', () => {
        const manager = new AudioManager(connectionData, audioDataFile)
        manager.CreateConnection()
        manager.PlayAudioOnConnection()
        const voice = require('@discordjs/voice')
        expect(voice.createAudioResource).toHaveBeenCalled()
        expect(voice.createAudioPlayer).toHaveBeenCalled()
        expect(manager['IsAudioPlaying']).toBe(true)
    })

    test('PlayAudioOnConnection loads link resource', () => {
        const manager = new AudioManager(connectionData, audioDataLink)
        manager.CreateConnection()
        manager.PlayAudioOnConnection()
        const voice = require('@discordjs/voice')
        expect(voice.createAudioResource).toHaveBeenCalled()
    })

    test('StopAudioOnConnection resets connection', () => {
        const manager = new AudioManager(connectionData, audioDataFile)
        manager.CreateConnection()
        manager.PlayAudioOnConnection()
        manager.StopAudioOnConnection()
        const voice = require('@discordjs/voice')
        expect(voice.joinVoiceChannel).toHaveBeenCalledTimes(2)
    })

    test('Pause and Resume audio', () => {
        const manager = new AudioManager(connectionData, audioDataFile)
        manager.CreateConnection()
        manager.PlayAudioOnConnection()
        manager.PauseAudio()
        manager.ResumeAudio()
        const voice = require('@discordjs/voice')
        const player = voice.createAudioPlayer.mock.results[0].value
        expect(player.pause).toHaveBeenCalled()
        expect(player.unpause).toHaveBeenCalled()
    })

    test('SetVolume validates range', () => {
        const manager = new AudioManager(connectionData, audioDataFile)
        manager.CreateConnection()
        manager.PlayAudioOnConnection()
        manager.SetVolume(50)
        const res = require('@discordjs/voice').createAudioResource.mock.results[0].value
        expect(res.volume.setVolume).toHaveBeenCalledWith(0.5)
        expect(() => manager.SetVolume(101)).toThrow()
    })

    test('DestroyConnection clears flags', () => {
        const manager = new AudioManager(connectionData, audioDataFile)
        manager.CreateConnection()
        manager.DestroyConnection()
        const voice = require('@discordjs/voice')
        const connection = voice.joinVoiceChannel.mock.results[0].value
        expect(connection.destroy).toHaveBeenCalled()
        expect(manager['IsActive']).toBe(false)
    })
})
