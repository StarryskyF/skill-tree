<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import { createChat, listChats, getChat, streamMessage } from '../../../../api/chat'
import type { Chat, ChatListItem, ChatMessage } from '../../../../api/chat'

interface ChatPanelProps {
  skillTreeId: string
  focusedNodeId: string | null
}

const props = defineProps<ChatPanelProps>()

const conversations = ref<ChatListItem[]>([])
const currentChat = ref<Chat | null>(null)
const inputText = ref('')
const isStreaming = ref(false)
const streamingContent = ref('')
const showHistory = ref(false)
const messagesEndRef = ref<HTMLElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

async function scrollToBottom() {
  await nextTick()
  messagesEndRef.value?.scrollIntoView({ behavior: 'smooth' })
}

async function loadConversations() {
  const res = await listChats(props.skillTreeId)
  if (res.data) conversations.value = res.data
}

async function loadOrCreateChat() {
  await loadConversations()
  if (conversations.value.length > 0) {
    await switchChat(conversations.value[0]._id)
  } else {
    await newChat()
  }
}

async function newChat() {
  const res = await createChat(props.skillTreeId)
  if (res.data) {
    currentChat.value = { ...res.data, messages: [] }
    await loadConversations()
    showHistory.value = false
  }
}

async function switchChat(chatId: string) {
  const res = await getChat(chatId)
  if (res.data) {
    currentChat.value = res.data
    showHistory.value = false
    await scrollToBottom()
  }
}

async function sendMessage() {
  const content = inputText.value.trim()
  if (!content || isStreaming.value || !currentChat.value) return

  inputText.value = ''

  const userMsg: ChatMessage = {
    role: 'user',
    content,
    nodeId: props.focusedNodeId ?? undefined,
    createdAt: new Date().toISOString(),
  }
  currentChat.value.messages.push(userMsg)

  // Update title optimistically if first message
  if (!currentChat.value.title) {
    currentChat.value.title = content.slice(0, 50)
  }

  isStreaming.value = true
  streamingContent.value = ''
  await scrollToBottom()

  try {
    const gen = streamMessage(currentChat.value._id, content, props.focusedNodeId ?? undefined)
    for await (const chunk of gen) {
      streamingContent.value += chunk
      await scrollToBottom()
    }
    currentChat.value.messages.push({
      role: 'assistant',
      content: streamingContent.value,
      createdAt: new Date().toISOString(),
    })
    streamingContent.value = ''
    await loadConversations()
  } catch {
    currentChat.value.messages.push({
      role: 'assistant',
      content: 'AI 回复失败，请重试。',
      createdAt: new Date().toISOString(),
    })
    streamingContent.value = ''
  } finally {
    isStreaming.value = false
    await scrollToBottom()
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

watch(() => props.skillTreeId, loadOrCreateChat, { immediate: false })

onMounted(loadOrCreateChat)
</script>

<template>
  <div class="chat-panel">
    <!-- Header -->
    <div class="chat-header">
      <span class="chat-header__title">AI 助手</span>
      <div class="chat-header__actions">
        <div class="chat-history-wrap">
          <button class="chat-btn" @click="showHistory = !showHistory">
            历史 ▾
          </button>
          <div v-if="showHistory" class="chat-history-dropdown">
            <div
              v-for="c in conversations"
              :key="c._id"
              class="chat-history-item"
              :class="{ active: currentChat?._id === c._id }"
              @click="switchChat(c._id)"
            >
              <div class="chat-history-item__title">{{ c.title || '新对话' }}</div>
              <div v-if="c.preview" class="chat-history-item__preview">{{ c.preview }}</div>
            </div>
            <div v-if="conversations.length === 0" class="chat-history-empty">暂无历史对话</div>
          </div>
        </div>
        <button class="chat-btn chat-btn--primary" @click="newChat">+ 新对话</button>
      </div>
    </div>

    <!-- Focused node tag -->
    <div v-if="focusedNodeId" class="chat-node-tag">
      <span class="chat-node-tag__dot"></span>
      <span>正在讨论节点</span>
    </div>

    <!-- Messages -->
    <div class="chat-messages">
      <div v-if="!currentChat" class="chat-empty">加载中...</div>
      <template v-else>
        <div v-if="currentChat.messages.length === 0 && !isStreaming" class="chat-empty">
          向 AI 提问关于当前学习内容的问题
        </div>
        <div
          v-for="(msg, i) in currentChat.messages"
          :key="i"
          class="chat-message"
          :class="msg.role === 'user' ? 'chat-message--user' : 'chat-message--assistant'"
        >
          <div class="chat-bubble">{{ msg.content }}</div>
        </div>
        <!-- Streaming bubble -->
        <div v-if="isStreaming" class="chat-message chat-message--assistant">
          <div class="chat-bubble">
            {{ streamingContent }}<span class="chat-cursor"></span>
          </div>
        </div>
      </template>
      <div ref="messagesEndRef"></div>
    </div>

    <!-- Input -->
    <div class="chat-input-area">
      <textarea
        ref="textareaRef"
        v-model="inputText"
        class="chat-textarea"
        placeholder="输入问题... (Enter 发送，Shift+Enter 换行)"
        :disabled="isStreaming"
        rows="3"
        @keydown="onKeydown"
      ></textarea>
      <button
        class="chat-send-btn"
        :disabled="isStreaming || !inputText.trim()"
        @click="sendMessage"
      >
        {{ isStreaming ? '...' : '发送' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.chat-panel {
  width: 360px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border-color);
  background-color: var(--bg-card);
  height: 100%;
  overflow: hidden;
}

.chat-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-color);
}

.chat-header__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.chat-header__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chat-btn {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  background-color: var(--bg-input);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: opacity 0.15s;
}

.chat-btn:hover { opacity: 0.75; }

.chat-btn--primary {
  background-color: #7c3aed;
  color: #fff;
  border-color: #7c3aed;
}

.chat-history-wrap {
  position: relative;
}

.chat-history-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  width: 220px;
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 50;
  max-height: 240px;
  overflow-y: auto;
}

.chat-history-item {
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--border-color);
  transition: background 0.15s;
}

.chat-history-item:last-child { border-bottom: none; }
.chat-history-item:hover { background-color: var(--bg-input); }
.chat-history-item.active { background-color: var(--bg-input); }

.chat-history-item__title {
  font-size: 13px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-history-item__preview {
  font-size: 11px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 2px;
}

.chat-history-empty {
  padding: 12px;
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
}

.chat-node-tag {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  background-color: rgba(124, 58, 237, 0.08);
  border-bottom: 1px solid var(--border-color);
  font-size: 11px;
  color: #7c3aed;
}

.chat-node-tag__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #7c3aed;
  flex-shrink: 0;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chat-empty {
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
  margin-top: 40px;
}

.chat-message {
  display: flex;
}

.chat-message--user { justify-content: flex-end; }
.chat-message--assistant { justify-content: flex-start; }

.chat-bubble {
  max-width: 85%;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.chat-message--user .chat-bubble {
  background-color: #7c3aed;
  color: #fff;
  border-bottom-right-radius: 4px;
}

.chat-message--assistant .chat-bubble {
  background-color: var(--bg-input);
  color: var(--text-primary);
  border-bottom-left-radius: 4px;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.chat-cursor {
  display: inline-block;
  width: 2px;
  height: 14px;
  background-color: currentColor;
  margin-left: 2px;
  vertical-align: middle;
  animation: blink 0.8s step-end infinite;
}

.chat-input-area {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid var(--border-color);
}

.chat-textarea {
  width: 100%;
  resize: none;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-input);
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.5;
  outline: none;
  transition: border-color 0.15s;
  font-family: inherit;
  box-sizing: border-box;
}

.chat-textarea:focus { border-color: #7c3aed; }
.chat-textarea:disabled { opacity: 0.6; }

.chat-send-btn {
  align-self: flex-end;
  padding: 6px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  background-color: #7c3aed;
  color: #fff;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s;
}

.chat-send-btn:hover:not(:disabled) { opacity: 0.85; }
.chat-send-btn:disabled { opacity: 0.45; cursor: not-allowed; }
</style>
