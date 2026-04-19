# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## 项目背景

### 项目名称

AI 驱动的游戏化技能树学习系统（AI-Driven Gamified Skill-Tree System）

### 核心问题

- **信息过载**：自主学习者面对海量信息无从下手
- **动力不足**：缺乏即时反馈和成就感，难以坚持
- **脚手架缺失**：传统学习路径固定，无法适应个体差异

### 解决方案

将学习路径建模为 **有向无环图（DAG）**，结合：

- **微学习**：分解目标为小节点，降低认知负荷
- **游戏化**：点亮技能树节点，提供视觉反馈和成就感
- **AI 辅导**：用大语言模型动态生成个性化学习路径

---

### 系统架构

前后端分离：

- 前端：Vue 3 + TypeScript + Tailwind + Pinia+(`frontend/`)
- 后端：NestJS + TypeScript + MongoDB (`backend/`)
- 通信：RESTful API

## 核心功能

### 1. 智能技能树生成

- **输入**：用户学习目标（如"学会 Vue 3"）
- **输出**：自动生成技能树 DAG，包含前置依赖关系
- **实现**：Prompt 工程驱动 LLM 生成稳定 JSON 结构

### 2. 前置依赖解锁机制

- 节点状态：🔒 锁定 → ⭐ 可学习 → ✅ 已完成
- 完成当前节点后自动解锁后续节点
- 防止跳过基础知识直接学习高阶内容

### 3. 个性化 AI 辅导（RAG）

- **检索增强生成**：基于用户学习历史提供上下文建议
- **动态脚手架**：根据进度调整难度（保持在最近发展区 ZPD）
- **持久化记忆**：记住之前的提问和测验结果

### 4. 游戏化反馈系统

- **经验值（EXP）和等级**：完成节点获得经验
- **路径相似度评分**：用树编辑距离算法对比专家路径
- **视觉反馈**：节点点亮动画、徽章解锁

### 5. 学习管理仪表板

- 查看当前进度和已解锁路径
- 历史学习记录和测验成绩
- 个性化推荐下一步学习内容

---

## 前端规范（frontend/）

### 技术栈

- **前端**：Vue 3 + TypeScript + Tailwind + Pinia+axios
  - **组件库**：Element Plus（基础 UI）
  - **可视化**：Vue Flow（技能树 DAG）
  - **动画**：GSAP（游戏化反馈）

- 使用 Composition API + `<script setup>`
- 不硬编码颜色，用 Tailwind 工具类
- API 调用用 `src/api/client.ts` 封装
- Props/Emits 必须有 TypeScript 类型
- pages文件夹下放页面组件,首先先是一个文件夹名字，这个文件夹名字，就是代表这个页面含义，然后和文件夹名字一样的vue作为页面组件，如果需要拆分，只有这个组件用的拆分，放在pages下的components文件夹下
- components下面放一些通用组件，stores下放pinia
- 请求写api文件夹下，抽离出方法，不要写死再组件内部
- utils放工具函数
- 组件名字表达这个组件功能不要用index.vue这种

### 样式规范

❌ **禁止硬编码颜色**
**使用定义变量的方式**

✅ **使用 Tailwind 主题**
**ui设计参考front-design下的SKILL.md**

- 页面风格统一
- 注册暗色亮色模式切换，写样式的时候注意适配
- 暗色游戏风
  - 深色背景，突出技能游戏树感觉
- 亮色极简风
  - 白底，干净现代的学习平台感

### 组件规范

- 函数组件 + TypeScript
- Props 接口命名：`ComponentNameProps`
- 文件命名：`ComponentName.tsx`

### API 调用

使用 `src/api/client.ts` 封装，自动处理 loading/error

---

## 后端规范（backend/）

- 每个模块：controller + service + schema + dto
- DTO 必须用 class-validator 验证
- 所有查询处理 NotFoundException
- MongoDB 用 Mongoose ODM
- MongoDB 每个表都有创建时间修改时间
- 搭建日志系统，再需要地方都打上日志，方便找错
- 响应数据统一格式
- 后端需要权限校验，不确定这个功能加不加的话问我

### 路由命名

- 使用复数：`/users` 不是 `/user`
- RESTful 风格：GET/POST/PUT/DELETE

---

## 工作流程提示

### 当你开发前端时：

- 关注「前端规范」部分
- 颜色使用 Tailwind 主题
- API 调用使用封装

### 当你开发后端时：

- 关注「后端规范」部分
- API 返回统一格式
- 数据库查询设置超时

### 跨前后端任务：

- 先了解「项目背景」
- 分别遵守前后端规范
