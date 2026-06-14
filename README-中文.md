# AI 驱动的游戏化技能树学习系统

这是一个用于毕设的全栈原型项目。系统目标是帮助自学者把一个较大的学习目标拆成结构化技能树，通过节点测验、AI 辅导、RAG 资料检索和游戏化反馈来支持学习过程。

英文版 `README.md` 适合提交；这份中文说明主要方便自己理解、运行和答辩前复习。

## 项目实现目标

项目主要对应论文里的三层目标：

1. **基础学习系统**
   - 用户注册、登录和 JWT 鉴权。
   - 用户资料和技能树状态持久化。
   - AI 根据学习目标生成技能树。
   - 技能树按 DAG 结构校验。
   - 节点根据前置依赖锁定和解锁。

2. **个性化学习支持**
   - 上传 PDF 学习资料并进入 RAG 检索。
   - 保存 quiz 错题作为学习记忆。
   - AI 聊天结合技能树进度、上传资料和历史错题回答。
   - RAG 或向量服务不可用时，主学习流程不会直接崩掉。

3. **评估与游戏化**
   - 用 LCS 计算学习路径相似度。
   - 完成节点后获得 EXP、等级、连续学习和徽章反馈。
   - Evaluation 页面展示结构质量、学习过程、RAG、游戏化等指标。
   - 自动评估脚本会走真实 API 流程，生成论文可用数据。

## 技术栈

### 前端

- Vue 3
- TypeScript
- Vite
- Pinia
- Vue Router
- Element Plus
- Vue Flow

### 后端

- NestJS
- TypeScript
- MongoDB / Mongoose
- JWT 登录鉴权
- LangChain
- DeepSeek 兼容聊天模型 API
- OpenAI Embeddings
- Qdrant 向量数据库
- PDF 解析

## 项目结构

```text
project/
  backend/       后端 API、AI、RAG、技能树逻辑、评估脚本
  frontend/      前端页面、技能树可视化、聊天和 evaluation 页面
  docker-compose.yml
  README.md
  README-中文.md
```

## 环境变量

本地运行后端时，可以在 `project/backend/` 下创建 `.env`，也可以通过部署环境注入变量。

必需变量：

```env
MONGODB_URI=
JWT_SECRET=
DEEPSEEK_API_KEY=
OPENAI_API_KEY=
```

常用可选变量：

```env
PORT=3000
JWT_EXPIRES_IN=7d
DEEPSEEK_MODEL=deepseek-chat
QDRANT_URL=http://localhost:6333
CORS_ORIGIN=http://localhost:5173
```

如果用 `docker-compose.yml`，这些变量可以放在项目根目录 `.env` 或系统环境变量里。

## 本地运行

前后端分别安装依赖：

```bash
cd backend
npm install

cd ../frontend
npm install
```

启动后端：

```bash
cd backend
npm run start:dev
```

启动前端：

```bash
cd frontend
npm run dev
```

默认地址：

- 前端：`http://localhost:5173`
- 后端 API：`http://localhost:3000/api`

## 推荐演示流程

答辩或录屏时可以按这个顺序演示：

1. 注册或登录。
2. 输入学习目标和当前水平，创建技能树。
3. 可选：上传 PDF 资料。
4. 等待 AI 生成技能树。
5. 展示技能树节点和前置依赖锁定效果。
6. 打开可学习节点，做一次 quiz。
7. 可以先故意失败一次，展示错题会进入学习记忆。
8. 再通过 quiz，展示节点完成、后续节点解锁、EXP 和徽章反馈。
9. 打开 AI 聊天，问和当前节点、资料或错题相关的问题。
10. 打开 Evaluation 页面，展示 DAG、LCS、quiz、RAG、EXP、badge 等指标。

## 自动评估与论文数据

后端有自动评估脚本，它会像真实用户一样调用 API，而不是直接往数据库里塞假数据。

运行前要确保后端、MongoDB、Qdrant、DeepSeek/OpenAI key 都可用。

运行自动评估：

```bash
cd backend
npm run eval:run
```

把最新 JSON 结果生成 Markdown 报告：

```bash
npm run eval:report
```

输出目录：

```text
backend/evaluation-results/
```

这些数据可以写进论文实验/评估章节，例如：

- 技能树生成成功率
- DAG 合法率
- 平均节点数、边数、最大深度
- quiz 通过率
- 平均 quiz 分数
- LCS 路径相似度
- RAG 检索次数和命中率
- 获得 EXP 数量
- 解锁徽章数量

前端 Evaluation 页面也可以导出 CSV 和 JSON。

## 常用命令

后端：

```bash
npm run build
npm run test
npm run eval:run
npm run eval:report
```

前端：

```bash
npm run build
npm run dev
```

## 关键稳定性说明

### Quiz 判分

系统现在使用服务端 quiz session。前端拿到题目和 `quizSessionId`，提交答案时只传 `quizSessionId` 和用户选择。后端用自己保存的正确答案判分。

这样做的好处是：quiz 分数、节点完成、EXP、徽章和 evaluation 数据不会依赖前端传回的正确答案，更适合写进论文。

### RAG 和 PDF

上传 PDF 后，后端会解析文本并切分为片段，之后存入向量数据库用于检索。AI 生成技能树、生成 quiz 和聊天时，都可以参考这些资料。

如果 Qdrant 或 embedding 服务暂时不可用，系统会跳过检索，不会让主流程直接崩掉。

### 权限隔离

技能树、聊天和 evaluation 都按当前登录用户查询。聊天创建和发送消息时会检查 skill tree 是否属于当前用户，避免不同用户之间的数据串起来。

## 和论文的对应关系

- **Micro-learning**：一个大目标被拆成多个小技能节点。
- **Gamification**：EXP、等级、徽章、节点点亮和路径反馈。
- **AI scaffolding**：AI 生成技能树、生成 quiz，并通过聊天进行学习辅导。
- **Knowledge graph / DAG**：节点和边构成前置依赖图。
- **Personalisation / RAG**：上传资料和错题记忆进入检索上下文。
- **Evaluation**：LCS 路径相似度和 evaluation dashboard 提供实验数据。
