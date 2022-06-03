import {Plugin,MarkdownView, TFile, Modal, App, Notice, WorkspaceLeaf, ViewState, View, HeadingCache, Setting, PluginSettingTab, Menu} from "obsidian";

import Vue from "Vue";
import vHeadingTree from "./components/v-heading-tree.vue"

import {around} from 'monkey-around'

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

	constructor(plugin: FloatTocPlugin, view: MarkdownView,file: TFile) {
		this.plugin = plugin
		this.file = file;
		this.view = view;

		this.headingTree = new HeadingTree(0,0,"root");
		this.createTocTree();
	}

	private createTocTree() {
		
		this.container = document.createElement("div");
		this.container.addClass("markdown-toc-view");
		this.container.setAttr("data-file",this.file.path);

		const self = this;
		const vueApp = new Vue({
			el: this.container.createDiv(),
			render: (h:any) => h('v-heading-tree', {
				attrs: {
					data: this.headingTree,
				},
				on: {
					'select-heading': function(node: HeadingTree) {
						self.view.setEphemeralState({ line:node.line })
					},
					'setting': function(ev: MouseEvent) {
						const menu = new Menu(self.plugin.app);
						menu.addItem((item) => {
							item
								.setTitle("关闭")
								.setIcon("cross")
								.onClick(() => {
									self.plugin.fileTocMap.delete(self.file);
									self.unmount();
								})
						});


						// menu.addItem((item) => {
						// 	item
						// 		.setTitle("自动编号")
						// 		.setIcon("list")
						// 		.onClick(() => {
						// 			self.plugin.fileTocMap.delete(self.file);
						// 			self.unmount();
						// 		})
						// });

						menu.showAtMouseEvent(ev);
					}
				},
				ref: "tree",
			}),
			components: {
				vHeadingTree,
			}
		});

		// console.log(vueApp);
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

	mounted(): boolean {
		return Boolean(this.container);
	}
	unmount() {
		if (this.container) {
			this.view.contentEl.removeChild(this.container);
			this.container = null;
		}
	}


}


export default class FloatTocPlugin extends Plugin {

	fileTocMap: Map<TFile,Array<TocView>> = new Map();
	viewTocMap: Map<MarkdownView,TocView> = new Map();

	settings: FloatTocSetting;

	private addNewTocViewToMarkdownView(view: MarkdownView, file: TFile) {
		const tocView = new TocView(this,view,file);
		tocView.updateTree();
		tocView.mount();

		var tocViews = this.fileTocMap.get(file)
		if (!tocViews) {
			tocViews = new Array<TocView>()
			this.fileTocMap.set(file,tocViews);
		}

		tocViews.push(tocView);
		this.viewTocMap.set(view,tocView);
	}

	private removeTocViewOfMarkdownView(view: MarkdownView) {
		const tocView = this.viewTocMap.get(view);
		if (tocView) {
			tocView.unmount();
			const tocViews = this.fileTocMap.get(tocView.file);
			tocViews.remove(tocView);
			if (tocViews.length === 0) {
				this.fileTocMap.delete(tocView.file);
			}
			this.viewTocMap.delete(view);
		}
	}

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new FloatTocSettingTab(this.app, this));


		const self = this;


		// TODO: do we have file-close event??
		this.register(around(WorkspaceLeaf.prototype,{
			detach(next) {
				return function() {
					const oldView = this.view;
					if (oldView instanceof MarkdownView) { // old markdown file is close!!
						self.removeTocViewOfMarkdownView(oldView);
					}
					return next.apply(this);
				}
			},
			setViewState(next) {
				return function (state: ViewState, ...rest: unknown[]) {
					const oldView = this.view;
					if (oldView instanceof MarkdownView && state.type !== "markdown") { // old markdown file is close!!
																						// if state.type === "markdown" then file is changed
						self.removeTocViewOfMarkdownView(oldView);
					}	

					return next.apply(this, [state, ...rest]);
				};
			}
		}))


		
		const eventRefFileOpen = this.app.workspace.on('file-open', (file) => {
			if (!file) return; 
			

			const view = this.app.workspace.activeLeaf.view; 
			if (!(view instanceof MarkdownView)) return;		// not markdown view

			const oldToc = this.viewTocMap.get(view);
			if (oldToc && oldToc.file === file) return;			// same file


			// file is changed
			// remove old toc 
			this.removeTocViewOfMarkdownView(view);

			// create new toc
			if (this.app.metadataCache.getFileCache(file)?.frontmatter?.["float-toc"] === false) return; // dont display
			if (this.app.metadataCache.getFileCache(file)?.frontmatter?.["float-toc"] !== true) {
				for (var i = 0; i < this.settings.excludePaths.length; i++) {
					if (file.path.startsWith(this.settings.excludePaths[i])) return;
				}
			}
			
			this.addNewTocViewToMarkdownView(view,file);
		});

		const eventRefCacheChanged = this.app.metadataCache.on("changed",(file,data,cache) => {
			const tocViews = this.fileTocMap.get(file);
			if (!tocViews || tocViews.length === 0) return;

			tocViews.forEach((t) => {
				t.updateTree();
			})
		})

		this.register(() => {
			this.app.workspace.offref(eventRefFileOpen);
			this.app.workspace.offref(eventRefCacheChanged);
		})
	}

	onunload() {

		for (const view of this.viewTocMap.keys()) {
			this.removeTocViewOfMarkdownView(view);
		}
	}


	private async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}



interface FloatTocSetting {
	excludePaths: Array<string>
}

const DEFAULT_SETTINGS: FloatTocSetting = {
	excludePaths: []
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