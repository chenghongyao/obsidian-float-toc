<template>
    <div v-if="tree.children.length" class="toc-folder" :class="{'is-collapsed':!isOpen}" :style="{'--heading-level': tree.level}">
        <div class="toc-folder-title"
            @click="onSelectHeading"
        >
            <!-- <div class="toc-folder-collapse-indicator"></div> -->
            <div class="toc-folder-title-content">
                {{tree.title}}
            </div>
        </div>
        <div v-show="isOpen" class="toc-folder-children">
            <v-heading-tree-item v-for="(child,index) in tree.children" 
                :key="index" 
                :tree="child"
                @select-heading="(node) => $emit('select-heading',node)"
                
            />
        </div>
    </div>
    <div v-else class="toc-heading" :style="{'--heading-level': tree.level}">
        <div class="toc-heading-title"
            @click="onSelectHeading"
        >
            <div class="toc-heading-title-content">
                {{tree.title}}
            </div>
        </div>
    </div>
</template>
<script>
export default {
    name: 'v-heading-tree-item',
    data() {
        return {
            isOpen: true,
            isActivate: false,
        }
    },
    props: {
        tree: Object,
    },
    methods: {
        toggleFolder() {
            this.isOpen = !this.isOpen;
        },
        onSelectHeading() {
            this.$emit('select-heading',this.tree);
        }
    }
}
</script>