<script setup lang="ts">
interface LevelUpOverlayProps {
  oldLevel: number
  newLevel: number
  levelName: string
}

defineProps<LevelUpOverlayProps>()
const emit = defineEmits<{ close: [] }>()

setTimeout(() => emit('close'), 3200)
</script>

<template>
  <div class="levelup-overlay" @click="emit('close')">
    <div class="levelup-particles">
      <span v-for="i in 12" :key="i" class="levelup-particle" :style="`--i:${i}`"></span>
    </div>
    <div class="levelup-card">
      <div class="levelup-label">LEVEL UP!</div>
      <div class="levelup-nums">
        <span class="levelup-old">{{ oldLevel }}</span>
        <span class="levelup-arrow">→</span>
        <span class="levelup-new">{{ newLevel }}</span>
      </div>
      <div class="levelup-name">{{ levelName }}</div>
    </div>
  </div>
</template>

<style scoped>
.levelup-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(6px);
  animation: overlay-in 0.3s ease;
}

@keyframes overlay-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.levelup-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  animation: card-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes card-pop {
  from { transform: scale(0.4); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}

.levelup-label {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.3em;
  color: #fbbf24;
  text-transform: uppercase;
  animation: pulse-text 0.8s ease infinite alternate;
}

@keyframes pulse-text {
  from { opacity: 0.7; }
  to   { opacity: 1; text-shadow: 0 0 20px #fbbf24; }
}

.levelup-nums {
  display: flex;
  align-items: center;
  gap: 20px;
}

.levelup-old {
  font-size: 64px;
  font-weight: 900;
  color: var(--text-muted);
  opacity: 0.5;
}

.levelup-arrow {
  font-size: 32px;
  color: #fbbf24;
  animation: arrow-bounce 0.6s ease infinite alternate;
}

@keyframes arrow-bounce {
  from { transform: translateX(-4px); }
  to   { transform: translateX(4px); }
}

.levelup-new {
  font-size: 96px;
  font-weight: 900;
  background: linear-gradient(135deg, #fbbf24, #f59e0b, #f97316);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: new-level-in 0.6s 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes new-level-in {
  from { transform: scale(0); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}

.levelup-name {
  font-size: 20px;
  font-weight: 700;
  color: white;
  letter-spacing: 0.1em;
  animation: fade-up 0.5s 0.4s ease both;
}

@keyframes fade-up {
  from { transform: translateY(12px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

/* Particles */
.levelup-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.levelup-particle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: conic-gradient(#fbbf24, #7c3aed, #06b6d4, #10b981);
  background: var(--p-color, #fbbf24);
  animation: particle-fly 1.2s calc(var(--i) * 0.08s) cubic-bezier(0.2, 0.8, 0.4, 1) both;
  --angle: calc(var(--i) * 30deg);
  --dist: calc(180px + var(--i) * 15px);
}

.levelup-particle:nth-child(odd)  { background: #fbbf24; width: 8px;  height: 8px; }
.levelup-particle:nth-child(3n)   { background: #7c3aed; width: 12px; height: 6px; border-radius: 3px; }
.levelup-particle:nth-child(4n)   { background: #06b6d4; }
.levelup-particle:nth-child(5n)   { background: #10b981; }

@keyframes particle-fly {
  0%   { transform: translate(-50%, -50%) rotate(var(--angle)) translateX(0) scale(1); opacity: 1; }
  100% { transform: translate(-50%, -50%) rotate(var(--angle)) translateX(var(--dist)) scale(0); opacity: 0; }
}
</style>
