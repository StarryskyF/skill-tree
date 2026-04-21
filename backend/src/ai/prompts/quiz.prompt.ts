export function buildQuizPrompt(title: string, description: string, treeGoal: string): string {
  return `你是一个专业的学习评估专家。请为以下技能节点生成3道单选测试题，用于检验学习者是否掌握了该知识点。

学习目标（技能树主题）：${treeGoal}
技能节点名称：${title}
技能节点描述：${description}

请返回一个 JSON 数组，包含恰好3个题目对象，每个对象包含：
- question: 题目描述（清晰、具体，考察该节点的核心概念）
- options: 恰好4个选项的字符串数组（有一个明确正确答案，其余为合理干扰项）
- correctIndex: 正确答案的索引（0到3之间的整数）

只返回 JSON 数组，不要有任何 markdown 代码块或额外说明。`;
}
