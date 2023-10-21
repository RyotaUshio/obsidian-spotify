import { Notice, Plugin } from 'obsidian';
import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { DEFAULT_SETTINGS, SpotifyPluginSettingTab, SpotifyPluginSettings } from './settings';
import { LoopManager } from './loop';


const CLIENT_ID = "db1e1a9ca4794417a77513bb76f2ae83";
const REDIRECT_URI = "obsidian://spotify";
const SCOPES = [
	"user-read-currently-playing",
	"user-read-playback-state",
	"user-modify-playback-state"
];

export default class SpotifyPlugin extends Plugin {
	settings: SpotifyPluginSettings;
	sdk: SpotifyApi;
	loopManager: LoopManager;

	async onload() {

		this.registerObsidianProtocolHandler(
			"spotify", ({ code }) => {
				window.location.search = `?code=${code}`;
			}
		)

		// await this.loadSettings();
		// this.addSettingTab(new SpotifyPluginSettingTab(this));

		this.sdk = SpotifyApi.withUserAuthorization(CLIENT_ID, REDIRECT_URI, SCOPES);
		// @ts-ignore
		window['spotify'] = this.sdk;

		this.loopManager = new LoopManager(this.sdk);
		this.registerCommands();
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async getActiveDevice() {
		const { devices } = await this.sdk.player.getAvailableDevices();
		return devices.find(device => device.is_active) ?? null;
	}

	private registerCommands() {
		this.registerAuthCommands();
		this.registerPlayerCommands();
	}

	private registerAuthCommands() {
		this.addCommand({
			id: 'reflesh-token',
			name: 'Reflesh Access Token',
			callback: async () => {
				// @ts-ignore
				await this.sdk.authenticationStrategy.removeAccessToken();
				await this.sdk.authenticate();
			},
		});
	}

	private _callForActiveDevice = async (cb: (device_id: string) => Promise<void>) => {
		const activeDevice = await this.getActiveDevice();
		if (activeDevice?.id) {
			await cb(activeDevice.id);
		} else {
			new Notice(`${this.manifest.name}: No active device found.`);
		}
	};

	startResumePlayback = async (...args: any[]) => this._callForActiveDevice(async (id) => {
		await this.sdk.player.startResumePlayback(id, ...args);
	});
	pausePlayback = async () => this._callForActiveDevice(this.sdk.player.pausePlayback.bind(this.sdk.player));

	private registerPlayerCommands() {
		this.addCommand({
			id: 'start/pause',
			name: 'Toggle Play/Pause',
			callback: async () => {
				const state = await this.sdk.player.getPlaybackState();
				if (state.is_playing) {
					await this.pausePlayback();
				} else {
					await this.startResumePlayback();
				}
			}
		});
	}
}
