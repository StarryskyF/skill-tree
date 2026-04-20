<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

interface SkillTreeNodeProps {
  data: {
    id: string
    title: string
    description: string
    level: number
    status?: 'locked' | 'available' | 'completed'
  }
}

const props = defineProps<SkillTreeNodeProps>()

const status = props.data.status ?? 'available'
</script>

<template>
  <div
    class="skill-node"
    :class="[`skill-node--${status}`, { 'skill-node--clickable': status === 'available' }]"
  >
    <Handle type="target" :position="Position.Left" />

    <div class="skill-node__icon">
      <span v-if="status === 'completed'">✓</span>
      <span v-else-if="status === 'locked'">🔒</span>
      <span v-else>⭐</span>
    </div>

    <div class="skill-node__body">
      <p class="skill-node__title">{{ props.data.title }}</p>
      <p class="skill-node__desc">{{ props.data.description }}</p>
    </div>

    <Handle type="source" :position="Position.Right" />
  </div>
</template>

<style scoped>
.skill-node {
  width: 190px;
  padding: 10px 12px;
  border-radius: 12px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  border: 1.5px solid transparent;
  cursor: default;
  transition: box-shadow 0.2s, transform 0.15s;
}

.skill-node:hover {
  transform: scale(1.03);
}

.skill-node--available {
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.12), rgba(6, 182, 212, 0.12));
  border-color: rgba(124, 58, 237, 0.5);
  box-shadow: 0 0 12px rgba(124, 58, 237, 0.2);
}

.skill-node--completed {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.12));
  border-color: rgba(16, 185, 129, 0.5);
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.2);
}

.skill-node--locked {
  background: rgba(100, 116, 139, 0.08);
  border-color: rgba(100, 116, 139, 0.3);
  opacity: 0.6;
}

.skill-node--clickable {
  cursor: pointer;
}

.skill-node--clickable:hover {
  box-shadow: 0 0 20px rgba(124, 58, 237, 0.4);
}

.skill-node__icon {
  font-size: 14px;
  flex-shrink: 0;
  margin-top: 1px;
}

.skill-node__body {
  flex: 1;
  min-width: 0;
}

.skill-node__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 3px;
  line-height: 1.3;
}

.skill-node__desc {
  font-size: 11px;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.4;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
