export function buildSkillTreePrompt(goal: string, currentLevel: string): string {
  return `你是一个专业的学习路径规划师。请根据用户的学习目标和当前水平，生成一个技能树学习路径。

学习目标：${goal}
当前水平：${currentLevel}

请返回一个 JSON 对象，包含以下字段：
- title: 技能树的标题（简洁，如"Vue 3 前端开发技能树"）
- nodes: 技能节点数组（5到20个节点）
- edges: 依赖关系数组

每个 node 包含：
- id: 唯一标识符，格式为 "node_1", "node_2" 等
- title: 节点名称（简洁，不超过15字）
- description: 一句话描述这个节点学什么（不超过50字）
- level: 节点深度，从0开始（0=基础入门，数字越大越高级）
- prerequisites: 前置节点的 id 数组（根节点为空数组）
- exp: 完成该节点获得的经验值，整数，范围5-50，根据节点难度决定（基础节点5-15，中级15-30，高级30-50）

每个 edge 包含：
- id: 格式为 "edge_1", "edge_2" 等
- source: 前置节点 id
- target: 依赖该前置节点的节点 id

要求：
1. 只返回 JSON，不要有任何 markdown 代码块或额外说明
2. 节点从基础到高级，确保依赖关系合理
3. 每个高级节点必须有至少一个前置节点
4. 节点数量控制在 8-15 个最为合适
5. 结合用户当前水平，跳过已掌握的基础知识

示例结构（不要照抄，根据实际目标生成）：
{"title":"...","nodes":[{"id":"node_1","title":"...","description":"...","level":0,"prerequisites":[],"exp":10},{"id":"node_2","title":"...","description":"...","level":1,"prerequisites":["node_1"],"exp":25}],"edges":[{"id":"edge_1","source":"node_1","target":"node_2"}]}`
}
