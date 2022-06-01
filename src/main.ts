import {Plugin,MarkdownView, TFile, Modal, App, Notice, WorkspaceLeaf, ViewState, View, HeadingCache} from "obsidian";

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

function buildHeadingTree(headings: Array<HeadingCache>, start: number, tree: HeadingTree, firstLevel: boolean) {
	var currentLevel = 0;
	var i = start;
	for (; i < headings.length; i++) {
		const h = headings[i];
		if (currentLevel === 0 || currentLevel === h.level) {
			const res = new HeadingTree(h.level,h.position.start.line,h.heading);
			tree.push(res);
			currentLevel = h.level
		}
		else if (currentLevel < h.level) {
			const lastIndex = buildHeadingTree(headings,i,tree.last(),false);
			i = lastIndex;
		} else if (firstLevel){ //currentLevel > h.level
			const res = new HeadingTree(h.level,h.position.start.line,h.heading);
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
	app: App;

	constructor(app: App, view: MarkdownView,file: TFile) {
		this.app = app;
		this.file = file;
		this.view = view;


		const headings = this.app.metadataCache.getFileCache(file).headings || [];
		
		this.headingTree = new HeadingTree(0,0,"root");
		buildHeadingTree(headings,0,this.headingTree,true);

		
	}

	private createTocContainer() {
		this.container = this.view.contentEl.createDiv("markdown-toc-view");
		this.container.setAttr("data-file",this.file.path);
	}


	private mountTocTree() {
		
		const self = this;
		new Vue({
			el: this.container.createDiv(),
			render: (h:any) => h('v-heading-tree', {
				attrs: {
					data: this.headingTree,
				},
				on: {
					'select-heading': function(node: HeadingTree) {
						console.log("select",node);
						self.view.setEphemeralState({ line:node.line })
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
		const headings = this.app.metadataCache.getFileCache(this.file).headings;
		this.headingTree.clear();
		buildHeadingTree(headings,0,this.headingTree,true);
	}

	mount() {
		this.createTocContainer();
		this.mountTocTree();
	}

	unmount() {
		if (this.container) {
			this.view.contentEl.removeChild(this.container);
		}
	}


}



export default class QuickTagsPlugin extends Plugin {

	fileTocMap: Map<TFile,any> = new Map();

	async onload() {

		const eventRefFileOpen = this.app.workspace.on('file-open', (file) => {
			if (!file) return;

			const view = this.app.workspace.activeLeaf.view;
			if (!(view instanceof MarkdownView)) return;

			const oldTocView = view.contentEl.getElementsByClassName("markdown-toc-view")?.[0]
			const oldFilePath = oldTocView?.getAttr("data-file");

			if (oldFilePath !== file.path) {

				// remove old toc
				if (oldFilePath) {
					const oldFile = this.app.vault.getAbstractFileByPath(oldFilePath) as TFile;
					this.fileTocMap.delete(oldFile);
					view.contentEl.removeChild(oldTocView);
				}

				const tocView = new TocView(this.app,view,file);
				tocView.mount();
				this.fileTocMap.set(file,tocView);
			}

		});

		const eventRefCacheChanged = this.app.metadataCache.on("changed",(file, data,cache) => {
			const tocView = this.fileTocMap.get(file);
			if (!tocView) return;

			tocView.updateTree();
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
}
