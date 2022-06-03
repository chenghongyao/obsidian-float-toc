<template>
    <div class="toc-view-container" :class="{'minimize': minimize}">
        <div class="toc-tool-container" :class="{'searching': searching}">


            <!-- 全部展开/折叠，自动展开 -->
            <div class="toc-tool-item" title="Setting" @click="onSetting($event)">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                <circle cx="12" cy="12" r="3"></circle>
                </svg>
            </div>
            <div class="toc-tool-item" title="Folding All">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
                <!-- <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg> -->
            </div>
            <div class="toc-tool-item" title="Auto Fold">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 4H3"></path>
                <path d="M18 8H6"></path>
                <path d="M19 12H9"></path>
                <path d="M16 16h-6"></path>
                <path d="M11 20H9"></path>
                </svg>
            </div>

            <div class="toc-tool-item" @click="onSearch" title="Search">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
            </div>

            <!-- <div class="toc-tool-item" @click="onClose" title="Close">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </div> -->

            <div class="toc-tool-item" @click="onMinimize" title="Minimize">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            </div>

        </div>

        <div class="toc-headding-container">
            <v-heading-tree-item v-for="(child,index) in tree.children" 
                :key="index" 
                :tree="child"
                @select-heading = "(node) => $emit('select-heading',node)"
            />
		</div>
        <div class="toc-empty_space bottom"></div>
    </div>
</template>

<script>
import vHeadingTreeItem from "./v-heading-tree-item.vue"

export default {
    name: 'v-heading-tree',
    data() {
        return {
            tree: this.data,
            minimize: false,
            searching: false,
        }
    },
    props: {
        data: Object,
    },
    methods: {
        onMinimize() {
            this.toggleMinimize();
        },
        // onClose() {
        //     this.$emit("close");
        // },
        onSearch() {
            this.searching = true;
        },
        onSetting(ev) {
            this.$emit("setting", ev);
        },
        toggleMinimize() {
            this.minimize = !this.minimize;
        },
        toggleFoldAll() {
            
        }
    },
    components: {
        vHeadingTreeItem
    }
}
</script>