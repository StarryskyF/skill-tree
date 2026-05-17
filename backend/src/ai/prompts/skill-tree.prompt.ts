import type { AppLanguage } from '../../skill-trees/dto/create-skill-tree.dto';

export function buildSkillTreePrompt(
  goal: string,
  currentLevel: string,
  documentContext?: string,
  language: AppLanguage = 'zh-CN',
): string {
  return language === 'en-US'
    ? buildEnglishPrompt(goal, currentLevel, documentContext)
    : buildChinesePrompt(goal, currentLevel, documentContext);
}

function buildChinesePrompt(goal: string, currentLevel: string, documentContext?: string): string {
  const docSection = documentContext
    ? `\n参考资料（请基于这些内容规划技能节点，覆盖资料中的核心知识点）：\n${documentContext}\n`
    : '';

  return `你是一个专业的学习路径规划师。请根据用户的学习目标和当前水平，生成一个技能树学习路径。

学习目标：${goal}
当前水平：${currentLevel}${docSection}

请只返回一个 JSON 对象，字段如下：
- title: 技能树标题，简洁自然，例如 "Vue 3 前端开发技能树"
- nodes: 技能节点数组，建议 8-15 个节点
- edges: 节点依赖关系数组

每个 node 必须包含：
- id: 唯一标识，格式为 "node_1", "node_2"
- title: 节点名称，不超过 15 个中文字符
- description: 一句话描述该节点要学什么，不超过 50 个中文字符
- level: 节点深度，从 0 开始，数字越大越高级
- prerequisites: 前置节点 id 数组，根节点为空数组
- exp: 完成节点获得的经验值，整数 5-50，基础 5-15，中级 15-30，高级 30-50

每个 edge 必须包含：
- id: 格式为 "edge_1", "edge_2"
- source: 前置节点 id
- target: 依赖该前置节点的节点 id

要求：
1. 只返回 JSON，不要 markdown 代码块或额外说明
2. 所有 title、description 必须使用中文
3. 节点从基础到高级递进，依赖关系合理
4. 每个高级节点至少有一个前置节点
5. 结合用户当前水平，跳过已经掌握的过浅知识

示例结构：
{"title":"...","nodes":[{"id":"node_1","title":"...","description":"...","level":0,"prerequisites":[],"exp":10},{"id":"node_2","title":"...","description":"...","level":1,"prerequisites":["node_1"],"exp":25}],"edges":[{"id":"edge_1","source":"node_1","target":"node_2"}]}`;
}

function buildEnglishPrompt(goal: string, currentLevel: string, documentContext?: string): string {
  const docSection = documentContext
    ? `\nReference material. Use it to plan skill nodes and cover the core concepts in the material:\n${documentContext}\n`
    : '';

  return `You are an expert learning-path designer. Generate a skill-tree learning path from the user's goal and current level.

Learning goal: ${goal}
Current level: ${currentLevel}${docSection}

Return only one JSON object with these fields:
- title: A concise skill-tree title, for example "Vue 3 Frontend Development Skill Tree"
- nodes: An array of skill nodes, ideally 8-15 nodes
- edges: An array of dependency edges

Each node must include:
- id: A unique id, using "node_1", "node_2"
- title: A concise node name, no more than 8 English words
- description: One sentence describing what the learner studies in this node, no more than 25 English words
- level: Node depth starting from 0; higher means more advanced
- prerequisites: Array of prerequisite node ids; root nodes use an empty array
- exp: Integer experience points from 5-50; basics 5-15, intermediate 15-30, advanced 30-50

Each edge must include:
- id: Use "edge_1", "edge_2"
- source: Prerequisite node id
- target: Dependent node id

Requirements:
1. Return JSON only. Do not include markdown code fences or extra explanation
2. All title and description fields must be in English
3. Progress from fundamentals to advanced topics with sensible dependencies
4. Every advanced node must have at least one prerequisite
5. Adapt to the user's current level and skip basics they already know

Example structure:
{"title":"...","nodes":[{"id":"node_1","title":"...","description":"...","level":0,"prerequisites":[],"exp":10},{"id":"node_2","title":"...","description":"...","level":1,"prerequisites":["node_1"],"exp":25}],"edges":[{"id":"edge_1","source":"node_1","target":"node_2"}]}`;
}
