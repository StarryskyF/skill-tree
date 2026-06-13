# 项目开发路线与功能检查清单

这份文件作为后续开发时的项目约束。当前原则是：**只专注把项目本身做稳定、做完整、做好用**。指标、日志、评估数据都作为系统功能的一部分自然产生，不为了外部说明硬造功能。

## 1. 开发阶段规划

### V0.1 基础可靠性与认证

目标：先把用户系统、权限、配置和基础交互做稳，避免后续功能建立在不可靠的基础上。

要做：

- 确保 `/users/me` 不会返回用户密码 hash。
- 完善注册、登录、修改密码相关 DTO 校验。
- 启动时检查必要环境变量，例如 `MONGODB_URI`、`JWT_SECRET`、`DEEPSEEK_API_KEY`、`OPENAI_API_KEY`。
- 前端启动时校验本地 token 是否仍然有效，而不是只检查 localStorage 里有没有 token。
- 修复后端消息、前端 i18n、AI prompt 里的中文乱码。
- 头像上传后存相对路径，不写死 `localhost`。
- CORS、API 地址、上传路径等配置改成环境变量驱动。
- 补基础认证测试：注册、重复用户名、登录成功/失败、无 token 访问受保护接口、非法 token、`/users/me` 不泄露密码。

完成标准：

- 用户可以稳定注册、登录、退出、刷新页面保持状态。
- token 失效后前端能正确回到登录页。
- 用户资料接口不暴露敏感字段。
- 基础认证测试通过。

### V0.2 技能树核心稳定版

目标：让 AI 生成的技能树不只是“能显示”，而是结构可靠、依赖关系正确、后端有兜底校验。

要做：

- 增加 `validateAndNormalizeSkillTree()`。
- 检查节点 id 是否唯一。
- 检查 edge 的 `source` 和 `target` 是否都指向真实存在的节点。
- 检查 `edges` 和 `prerequisites` 是否一致。
- 检查是否为 DAG，拒绝或重试有环图。
- 检查 `level` 是否符合依赖方向。
- AI 输出结构不合法时自动重试，最终失败时保存明确错误。
- 前端清楚展示生成中、生成成功、生成失败状态。
- 补测试：DAG 校验、节点锁定/解锁、锁定节点不能 quiz、完成节点后解锁后续节点。

完成标准：

- 技能树生成失败时用户能看到明确状态。
- 入库的技能树结构经过后端校验。
- 锁定节点无法被绕过访问或完成。
- 技能树核心测试通过。

### V0.3 个性化学习记忆版

目标：让 RAG 和学习历史真正服务学习体验，而不是只作为“有接入”的功能。

要做：

- 修复 RAG 错题文本和文档文本里的中文乱码。
- 结构化保存 quiz 错题：题目、用户答案、正确答案、节点、时间。
- 聊天回答时使用上传资料和历史错题。
- 在合适场景下让 quiz 生成也参考 RAG 上下文。
- 记录 RAG 来源类型、命中数、检索元数据。
- 前端提示回答是否参考了上传资料或历史错题。
- 记录 RAG 检索次数、命中率、错题复用次数等真实系统行为。
- Qdrant 或 embedding 失败时要降级，不让页面或主流程崩掉。

完成标准：

- 上传资料后，相关提问能检索并使用资料内容。
- quiz 错题会被保存，并能在后续聊天中被检索使用。
- RAG 服务不可用时，普通学习流程仍可继续。

### V0.4 自适应学习引导版

目标：让系统能根据用户表现给出下一步建议，而不是只展示已经解锁的节点。

要做：

- 记录每个节点的 quiz 表现。
- 连续失败时推荐复习前置节点。
- 发现错题模式时生成补救性学习建议。
- 下一步推荐综合考虑：节点是否解锁、用户薄弱点、完成进度、最近表现。
- 在路径分析 UI 中展示推荐理由。
- 基础推荐稳定后，再考虑是否加入补救节点或动态调整路径。

完成标准：

- 用户完成或失败 quiz 后，推荐结果会随学习表现变化。
- 前端能解释为什么推荐某个节点。
- 推荐逻辑在后端可测试，不只依赖前端展示。

### V0.5 游戏化反馈闭环版

目标：把路径相似度、EXP、等级、徽章、视觉反馈连成一个完整的游戏化反馈闭环。

要做：

- 保留 LCS 作为路径相似度算法。
- 明确定义参考路径：短期可以是系统生成的 reference path，后续可以加入人工配置的 benchmark path。
- 让路径相似度影响奖励，例如按推荐顺序完成节点时获得额外 EXP。
- 扩展徽章体系：第一个节点、完成 10 个节点、完成整棵树、高相似度路径、quiz 全对、连续学习等。
- evaluation 页面区分结构质量、学习过程、RAG、游戏化反馈。
- 导出 CSV/JSON，方便查看系统真实运行数据。
- 补测试：LCS 分数、EXP bonus、徽章解锁、evaluation summary。

完成标准：

- 完成节点后，用户能得到清晰的 EXP、等级、徽章反馈。
- 路径相似度不只是展示，还能影响奖励或推荐。
- evaluation 页面能反映真实系统行为。

### V0.6 自动化系统评估版

目标：不用人工一次次操作系统，而是用脚本走真实 API，自动验证主要功能链路。

原则：

- 不直接往数据库插假的 evaluation event。
- 用脚本像真实用户一样调用后端 API。
- 这不是简单 mock 数据，而是“自动化模拟学习场景”。
- 指标来自真实系统链路，只是用户行为由脚本自动执行。

建议位置：

```text
backend/
  scripts/
    evaluation/
      run-evaluation.ts
      scenarios.ts
      report.ts
      fixtures/
```

建议 npm scripts：

```json
{
  "eval:run": "ts-node scripts/evaluation/run-evaluation.ts",
  "eval:report": "ts-node scripts/evaluation/report.ts"
}
```

脚本要做：

- 注册或登录实验用户。
- 创建固定学习场景，例如 Vue、Python 数据分析、机器学习、Docker、NestJS。
- 可选上传资料文件，触发文档 RAG。
- 等待技能树生成完成。
- 模拟学习行为：按推荐路径学习、quiz 失败、重试、完成节点、聊天提问、触发 RAG 检索。
- 调用真实 API 生成 quiz、提交答案、完成节点、发送 chat、读取 evaluation。
- 将结果导出到 `backend/evaluation-results/`。

可收集指标：

- 技能树生成成功率。
- 生成耗时。
- DAG 合法率。
- 平均节点数、边数、最大深度。
- edge/prerequisite 一致性。
- 完成率。
- LCS 路径相似度。
- quiz 通过率。
- 平均 quiz 分数。
- RAG 检索次数。
- RAG 命中率。
- 获得 EXP。
- 解锁徽章数量。

完成标准：

- 一条命令可以跑完整学习流程。
- 结果来自真实 API 和真实业务逻辑。
- 输出文件可以帮助开发者检查系统健康度和功能覆盖情况。

## 2. 每次开发功能前后的检查清单

### 认证与权限

- 这个接口是否需要登录？
- 用户私有数据是否加了 `JwtAuthGuard`？
- 查询数据库时是否带了 `userId` 条件？
- 一个用户是否可能访问另一个用户的技能树、聊天、资料或评估数据？
- token 是否由后端验证，而不是只由前端本地判断？

### 输入校验

- 每个 POST/PUT/PATCH 请求体是否有 DTO？
- 字符串是否有 `@IsString()`、`@IsNotEmpty()` 和合理长度限制？
- 枚举是否用 `@IsEnum()` 或 `@IsIn()` 校验？
- 数组是否校验了元素类型和长度？
- 文件上传是否限制了大小和 MIME 类型？

### API 响应与错误处理

- controller 是否只返回业务数据，并交给全局 interceptor 统一包装？
- 不要在 controller 里手动返回嵌套的 `{ success, data, message }`。
- 错误是否使用合适的 Nest 异常，例如 `BadRequestException`、`UnauthorizedException`、`ForbiddenException`、`NotFoundException`？
- 前端页面级请求是否有 loading 和 error 状态？
- AI/RAG 失败时是否能降级，而不是让页面崩掉？

### 前端 API 结构

- API 调用是否放在 `frontend/src/api/`？
- Vue 页面或组件里不要直接写 axios。
- 请求和响应的 TypeScript 类型是否同步更新？
- 前端是否按统一的 `ApiResponse<T>` 结构处理响应？

### 多语言

- 前端可见文案不要直接写死在组件里。
- 新文案要同时加到：
  - `frontend/src/i18n/zh-CN.ts`
  - `frontend/src/i18n/en-US.ts`
- Vue 组件里用 `t('key')`。
- 后端 AI prompt、quiz、skill tree 生成要尊重 `language: 'zh-CN' | 'en-US'`。
- 中文必须是正常 UTF-8，不要继续扩散乱码。

### 主题与样式

- 新功能要支持亮色和暗色模式。
- 不要硬编码大面积页面色、卡片色、文字色、边框色。
- 优先使用现有 CSS 变量：
  - `var(--bg-page)`
  - `var(--bg-card)`
  - `var(--bg-input)`
  - `var(--text-primary)`
  - `var(--text-secondary)`
  - `var(--text-muted)`
  - `var(--border-color)`
  - `var(--shadow-card)`
- 检查亮色和暗色下的对比度。
- 页面专属组件放在 `pages/<page>/components/`。
- 通用组件放在 `frontend/src/components/`。
- 不要新建含义不清的 `index.vue` 页面文件。

### 技能树一致性

- 改动是否会破坏 DAG？
- `edges` 和 `prerequisites` 是否仍然一致？
- 锁定节点是否在后端也被保护，而不是只在前端隐藏？
- 完成节点后是否正确更新节点状态、EXP、徽章和 evaluation event？
- 删除或生成失败后，相关数据是否处于合理状态？

### RAG 与 AI

- LLM 调用失败时功能是否还能给出可理解的失败状态？
- Qdrant 或 embedding 失败时是否会降级？
- 检索内容是否限定在当前用户和当前技能树？
- 上传资料和 quiz 错题是否保存了足够元数据？
- 回答中是否能体现使用了历史错题或上传资料？

### Evaluation 事件

- 这个功能是否会产生值得记录的系统行为？
- 尽量复用已有事件类型：
  - `tree_created`
  - `tree_ready`
  - `tree_failed`
  - `quiz_passed`
  - `quiz_failed`
  - `node_completed`
  - `exp_gained`
  - `badge_unlocked`
  - `rag_retrieved`
- metadata 中尽量记录有用信息，例如分数、耗时、命中数、节点数、自动化评估场景 id。

### 测试

- 如果改到认证、权限、DAG、quiz、EXP、徽章、RAG 降级、evaluation 指标，应补对应测试。
- LCS、DAG 校验、奖励计算这类逻辑优先写小而确定的单元测试。
- 关键用户流程可以补 e2e 测试。

## 3. 开发前快速自问

每次做功能前先问这 8 个问题：

1. 这个功能要不要登录？
2. 有没有跨用户访问风险？
3. 输入校验是否完整？
4. 前端 loading 和 error 是否处理？
5. 文案是否有中文和英文？
6. 亮色和暗色模式下是否都能看清？
7. 是否影响技能树 DAG、EXP、徽章、RAG 或 evaluation？
8. 是否需要测试，或者需要被自动化评估脚本覆盖？
