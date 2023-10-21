import { PluginSettingTab, Setting, TextComponent } from "obsidian";
import SpotifyPlugin from "./main";

export interface SpotifyPluginSettings {
    mySetting: string;
}

export const DEFAULT_SETTINGS: SpotifyPluginSettings = {
    mySetting: 'default'
}

export class SpotifyPluginSettingTab extends PluginSettingTab {
    constructor(public plugin: SpotifyPlugin) {
        super(plugin.app, plugin);
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
    }

    addTextSetting(key: keyof SpotifyPluginSettings, config: { name: string, desc?: string, placeholder?: string }, suggesterFactory: (text: TextComponent) => any) {
        new Setting(this.containerEl)
            .setName(config.name)
            .setDesc(config.desc ?? "")
            .addText(text => {
                text.setPlaceholder(config.placeholder ?? "")
                    .setValue(this.plugin.settings.mySetting)
                    .onChange(async (value) => {
                        this.plugin.settings.mySetting = value;
                        await this.plugin.saveSettings();
                    })
            });
    }
}


