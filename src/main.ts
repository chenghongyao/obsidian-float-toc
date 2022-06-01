import {Plugin,MarkdownView, TFile, Modal, App, Notice, WorkspaceLeaf, ViewState, View, HeadingCache, Setting, PluginSettingTab} from "obsidian";

import Vue from "Vue";
import vHeadingTree from "./components/v-heading-tree.vue"


class HeadingTree {
	level: number;
	line: number;
	title: string;

	children: Array<HeadingTree>;

	constructor(level: number, line: number, title: string) {
		this.level = level;
		this.line = line;
		this.title = title;
		this.children = new Array<HeadingTree>();

	}

	push(node: HeadingTree) {
		this.children.push(node);
	}

	last() : HeadingTree{
		return this.children.last();
	}

	clear() {
		this.children = [];
	}

}

function buildHeadingTree(headings: Array<HeadingCache>, start: number, tree: HeadingTree, firstLevel: boolean, levelOff: number) {
	var currentLevel = 0;
	var i = start;
	for (; i < headings.length; i++) {
		const h = headings[i];
		if (currentLevel === 0 || currentLevel === h.level) {
			const res = new HeadingTree(h.level - levelOff,h.position.start.line,h.heading);
			tree.push(res);
			currentLevel = h.level
		}
		else if (currentLevel < h.level) {
			const lastIndex = buildHeadingTree(headings,i,tree.last(),false, levelOff);
			i = lastIndex;
		} else if (firstLevel){ //currentLevel > h.level
			const res = new HeadingTree(h.level  - levelOff ,h.position.start.line,h.heading);
			tree.push(res);
			currentLevel = h.level
		} else {
			break;
		}
	}
	return i-1;
}


class TocView {
	view: MarkdownView;
	file: TFile;
	container: HTMLElement;
	headingTree: HeadingTree;
	plugin: FloatTocPlugin;
	display: boolean;

	constructor(plugin: FloatTocPlugin, view: MarkdownView,file: TFile) {
		this.plugin = plugin
		this.file = file;
		this.view = view;
		this.display = true;

		this.headingTree = new HeadingTree(0,0,"root");
		this.createTocTree();
	}

	private createTocTree() {
		
		this.container = document.createElement("div");
		this.container.addClass("markdown-toc-view");
		this.container.setAttr("data-file",this.file.path);


		const self = this;
		new Vue({
			el: this.container.createDiv(),
			render: (h:any) => h('v-heading-tree', {
				attrs: {
					data: this.headingTree,
				},
				on: {
					'select-heading': function(node: HeadingTree) {
						self.view.setEphemeralState({ line:node.line })
					},
					'close': function() {
						self.plugin.fileTocMap.delete(self.file);
						self.unmount();
					}
				},
				ref: "tree",
			}),
			components: {
				vHeadingTree,
			}
		});
	}

	updateTree() {
		const headings = this.plugin.app.metadataCache.getFileCache(this.file).headings || [];

		var minLevel = 999;
		headings.map((h) => {minLevel = h.level < minLevel ? h.level : minLevel});

		this.headingTree.clear();
		buildHeadingTree(headings,0,this.headingTree,true, minLevel === 999 ? 0 : minLevel - 1);
	}

	mount() {
		this.view.contentEl.appendChild(this.container);
	}

	unmount() {
		if (this.container) {
			this.view.contentEl.removeChild(this.container);
		}
	}


}

interface FloatTocSetting {
	excludePaths: Array<string>
}

const DEFAULT_SETTINGS: FloatTocSetting = {
	excludePaths: []
}
export default class FloatTocPlugin extends Plugin {

	fileTocMap: Map<TFile,TocView> = new Map();
	settings: FloatTocSetting;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new FloatTocSettingTab(this.app, this));

		const eventRefFileOpen = this.app.workspace.on('file-open', (file) => {
			if (!file) return;

			// is markdown view ??
			const view = this.app.workspace.activeLeaf.view;
			if (!(view instanceof MarkdownView)) return;

			// old toc ??
			const oldTocViewEl = view.contentEl.getElementsByClassName("markdown-toc-view")?.[0]
			const oldFilePath = oldTocViewEl?.getAttr("data-file");
			if (oldFilePath === file.path) return;  // not new file

			// remove old toc element
			if (oldFilePath) { // close file
				const oldFile = this.app.vault.getAbstractFileByPath(oldFilePath) as TFile;
				const oldToc = this.fileTocMap.get(oldFile);
				oldToc.unmount();
				this.fileTocMap.delete(oldFile);
			}

			// create new one
			// dont display
			if (this.app.metadataCache.getFileCache(file)?.frontmatter?.["float-toc"] === false) return;
			for (var i = 0; i < this.settings.excludePaths.length; i++) {
				if (file.path.startsWith(this.settings.excludePaths[i])) return;
			}
		
			const tocView = new TocView(this,view,file);
			this.fileTocMap.set(file,tocView);

			tocView.updateTree();
			tocView.mount();
			
		});

		const eventRefCacheChanged = this.app.metadataCache.on("changed",(file, data,cache) => {
			const tocView = this.fileTocMap.get(file);
			if (!tocView) return;

			if (cache?.frontmatter?.["float-toc"] === false) {
				tocView.unmount();
			} else {
				tocView.updateTree();
			}
		})

		this.register(() => {
			this.app.workspace.offref(eventRefFileOpen);
			this.app.workspace.offref(eventRefCacheChanged);
		})
	}

	onunload() {
		// this.fileTocMap.forEach((v) => {
		// 	v.unmount();
		// });
	}


	private async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


class FloatTocSettingTab extends PluginSettingTab {
	plugin: FloatTocPlugin;

	constructor(app: App, plugin: FloatTocPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}


	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", { text: "Float TOC" });

		new Setting(containerEl)
			.setName("排除路径")
			.setDesc("一行一个")
			.addTextArea((text) => {
				text.setValue(this.plugin.settings.excludePaths.join("\r\n")).onChange((value) => {
					this.plugin.settings.excludePaths = value.split("\n").map((t) => t.trim())
					this.plugin.saveSettings();
				})
			})


	}

}