import type { AppLanguage } from '../../skill-trees/dto/create-skill-tree.dto';

export function buildQuizPrompt(
  title: string,
  description: string,
  treeGoal: string,
  language: AppLanguage = 'zh-CN',
  learningContext?: string,
): string {
  return language === 'en-US'
    ? buildEnglishQuizPrompt(title, description, treeGoal, learningContext)
    : buildChineseQuizPrompt(title, description, treeGoal, learningContext);
}

function buildChineseQuizPrompt(title: string, description: string, treeGoal: string, learningContext?: string): string {
  const contextSection = learningContext
    ? `\n个性化上下文（来自用户上传资料或历史错题，请用来调整考察重点，但不要在题干中透露来源）：\n${learningContext}\n`
    : '';

  return `你是一个专业的学习测验出题助手。请为下面的技能节点生成 3 道单选题，用来判断用户是否掌握该节点。

学习目标：${treeGoal}
技能节点：${title}
节点描述：${description}${contextSection}

请只返回 JSON 数组，数组长度必须为 3。每道题包含：
- question: 题干
- options: 4 个选项
- correctIndex: 正确答案下标，0 到 3
- explanation: 简短解析，说明为什么正确答案是对的

要求：
1. 只返回 JSON，不要 markdown 代码块或额外说明
2. 所有题干、选项和解析必须使用中文
3. 题目应考察理解和应用，不要只问概念定义
4. 难度要适合该技能节点
5. 解析要简洁，适合用户复盘错题

示例：
[{"question":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"..."}]`;
}

function buildEnglishQuizPrompt(title: string, description: string, treeGoal: string, learningContext?: string): string {
  const contextSection = learningContext
    ? `\nPersonalized context from uploaded material or past mistakes. Use it to adjust assessment focus, but do not reveal the source in question text:\n${learningContext}\n`
    : '';

  return `You are an expert learning-assessment writer. Generate 3 single-choice questions for the skill node below to check whether the learner has mastered it.

Learning goal: ${treeGoal}
Skill node: ${title}
Node description: ${description}${contextSection}

Return only a JSON array with exactly 3 items. Each question must include:
- question: The question text
- options: 4 answer options
- correctIndex: The correct answer index from 0 to 3
- explanation: A short explanation of why the correct answer is right

Requirements:
1. Return JSON only. Do not include markdown code fences or extra explanation
2. All questions, options, and explanations must be in English
3. Test understanding and application, not only definitions
4. Keep difficulty appropriate for the skill node
5. Keep each explanation concise and useful for review

Example:
[{"question":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"..."}]`;
}
