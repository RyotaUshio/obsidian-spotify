import { SpotifyApi, Track, Episode } from '@spotify/web-api-ts-sdk';
import { Component } from 'obsidian';

export class LoopManager {
    timestamps: number[] = [];
    activeLooper: Looper | null = null;

    constructor(public sdk: SpotifyApi) {}

    addTimestamp(timestamp: number) {
        this.timestamps.push(timestamp);
    }

    async addCurrentTimestamp() {
        const state = await this.sdk.player.getPlaybackState();
        this.addTimestamp(state.progress_ms);
    }

    async enterLoop() {
        if (this.activeLooper) {
            await this.exitLoop();
        }

        const state = await this.sdk.player.getPlaybackState();
        const now = state.progress_ms;

        const startIndex = this.timestamps.findLastIndex(timestamp => timestamp < now);
        const endIndex = this.timestamps.findIndex(timestamp => timestamp > now);

        if (startIndex === -1 || endIndex === -1) {
            throw new Error("Couldn't find start or end of loop");
        }

        this.activeLooper = new Looper(this, state.item, this.timestamps[startIndex], this.timestamps[endIndex]);
        this.activeLooper.load();
    }

    async exitLoop() {
        this.activeLooper?.unload();
        this.activeLooper = null;
    }

    async goToPreviousTimestamp() {
        const state = await this.sdk.player.getPlaybackState();
        const now = state.progress_ms;
        const index = this.timestamps.findLastIndex(timestamp => timestamp < now);
        if (index >= 0) {
            this.sdk.player.seekToPosition(this.timestamps[index]);
        }
    }

    async goToNextTimestamp() {
        const state = await this.sdk.player.getPlaybackState();
        const now = state.progress_ms;
        const index = this.timestamps.findIndex(timestamp => timestamp > now);
        if (index >= 0) {
            this.sdk.player.seekToPosition(this.timestamps[index]);
        }
    }

    async goToBeforePreviousTimestamp() {
        const state = await this.sdk.player.getPlaybackState();
        const now = state.progress_ms;
        const index = this.timestamps.findLastIndex(timestamp => timestamp < now);
        if (index >= 1) {
            this.sdk.player.seekToPosition(this.timestamps[index - 1]);
        }
    }
}


export class Looper extends Component {
    constructor(private manager: LoopManager, public item: Track | Episode, public readonly start: number, public readonly end: number) {
        super();
        this.registerInterval(
            window.setInterval(async () => {
                const state = await this.manager.sdk.player.getPlaybackState();
                if (state.item.id != this.item.id) {
                    this.manager.exitLoop();
                    return;
                }
                this.manager.sdk.player.seekToPosition(this.start)
            }, this.end - this.start)
        );
    }
}