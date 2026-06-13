export type ScenarioLanguage = 'zh-CN' | 'en-US';

export interface EvaluationScenario {
  id: string;
  goal: string;
  currentLevel: string;
  language: ScenarioLanguage;
  maxNodesToComplete: number;
  failFirstQuiz: boolean;
  chatPrompt: string;
}

export const scenarios: EvaluationScenario[] = [
  {
    id: 'vue-foundations',
    goal: '系统学习 Vue 3 组件、路由和状态管理',
    currentLevel: 'beginner',
    language: 'zh-CN',
    maxNodesToComplete: 2,
    failFirstQuiz: true,
    chatPrompt: '请根据我的进度和错题，推荐下一步学习重点。',
  },
  {
    id: 'nestjs-api',
    goal: 'Build reliable NestJS REST APIs with authentication and testing',
    currentLevel: 'intermediate',
    language: 'en-US',
    maxNodesToComplete: 2,
    failFirstQuiz: false,
    chatPrompt: 'Based on my current path, what should I study next and why?',
  },
];
