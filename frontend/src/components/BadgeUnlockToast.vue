<script setup lang="ts">
interface BadgeUnlockToastProps {
  badges: Array<{ id: string; name: string }>
}

defineProps<BadgeUnlockToastProps>()
const emit = defineEmits<{ close: [] }>()

setTimeout(() => emit('close'), 4000)
</script>

<template>
  <div class="badge-toasts">
    <div
      v-for="(badge, i) in badges"
      :key="badge.id"
      class="badge-toast"
      :style="`animation-delay: ${i * 0.3}s`"
    >
      <div class="badge-toast__glow"></div>
      <div class="badge-toast__icon">🏅</div>
      <div class="badge-toast__text">
        <div class="badge-toast__label">解锁成就</div>
        <div class="badge-toast__name">{{ badge.name }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.badge-toasts {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-end;
}

.badge-toast {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 14px;
  background-color: var(--bg-card);
  border: 1px solid rgba(251, 191, 36, 0.4);
  box-shadow: 0 8px 32px rgba(251, 191, 36, 0.15), 0 2px 8px rgba(0,0,0,0.2);
  min-width: 220px;
  overflow: hidden;
  animation: toast-slide-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both,
             toast-fade-out 0.4s 3.6s ease forwards;
}

@keyframes toast-slide-in {
  from { transform: translateX(120%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}

@keyframes toast-fade-out {
  from { transform: translateX(0);    opacity: 1; }
  to   { transform: translateX(120%); opacity: 0; }
}

.badge-toast__glow {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(251,191,36,0.08), transparent);
  pointer-events: none;
}

.badge-toast__icon {
  font-size: 24px;
  flex-shrink: 0;
  animation: icon-spin 0.6s ease;
}

@keyframes icon-spin {
  from { transform: rotateY(0deg) scale(0); }
  to   { transform: rotateY(360deg) scale(1); }
}

.badge-toast__label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: #fbbf24;
  text-transform: uppercase;
}

.badge-toast__name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  margin-top: 2px;
}
</style>
