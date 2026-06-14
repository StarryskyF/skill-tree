import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { scenarios, type EvaluationScenario } from './scenarios';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

interface SkillNode {
  id: string;
  title: string;
  description: string;
  level: number;
  prerequisites: string[];
  exp: number;
}

interface SkillTree {
  _id: string;
  title: string;
  goal: string;
  status: 'generating' | 'ready' | 'failed';
  nodes: SkillNode[];
  completedNodes: string[];
  errorMessage?: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

interface QuizSession {
  quizSessionId: string;
  questions: QuizQuestion[];
}

interface ScenarioResult {
  scenarioId: string;
  skillTreeId?: string;
  status: 'passed' | 'failed';
  completedNodes: string[];
  quizAttempts: Array<{ nodeId: string; intended: 'fail' | 'pass'; score: number; passed: boolean; expGained?: number }>;
  pathAnalysis?: unknown;
  error?: string;
}

const apiBase = process.env.EVAL_API_BASE_URL ?? 'http://localhost:3000/api';
const username = process.env.EVAL_USERNAME ?? `eval_${Date.now()}`;
const password = process.env.EVAL_PASSWORD ?? 'EvalUser12345';
const generationTimeoutMs = Number(process.env.EVAL_GENERATION_TIMEOUT_MS ?? 120000);

async function main() {
  const startedAt = new Date();
  const token = await loginOrRegister();
  const scenarioResults: ScenarioResult[] = [];

  for (const scenario of scenarios) {
    scenarioResults.push(await runScenario(token, scenario));
  }

  const [summary, skillTrees] = await Promise.all([
    api<unknown>('/evaluation/summary', { method: 'GET' }, token),
    api<unknown>('/evaluation/skill-trees', { method: 'GET' }, token),
  ]);

  const report = {
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    apiBase,
    username,
    scenarioResults,
    summary,
    skillTrees,
  };

  const outputDir = join(__dirname, '..', '..', 'evaluation-results');
  await mkdir(outputDir, { recursive: true });
  const outputPath = join(outputDir, `evaluation-run-${startedAt.toISOString().replace(/[:.]/g, '-')}.json`);
  await writeFile(outputPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`Evaluation run completed: ${outputPath}`);
}

async function loginOrRegister(): Promise<string> {
  try {
    await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, name: 'Evaluation User' }),
    });
  } catch (err) {
    if (!String((err as Error).message).includes('409')) throw err;
  }

  const login = await api<{ access_token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  return login.access_token;
}

async function runScenario(token: string, scenario: EvaluationScenario): Promise<ScenarioResult> {
  const result: ScenarioResult = {
    scenarioId: scenario.id,
    status: 'failed',
    completedNodes: [],
    quizAttempts: [],
  };

  try {
    const created = await api<SkillTree>('/skill-trees', {
      method: 'POST',
      body: JSON.stringify({
        goal: scenario.goal,
        currentLevel: scenario.currentLevel,
        language: scenario.language,
      }),
    }, token);
    result.skillTreeId = created._id;

    let tree = await waitForReady(token, created._id);
    for (let index = 0; index < scenario.maxNodesToComplete; index++) {
      const node = nextAvailableNode(tree);
      if (!node) break;

      let quiz = await api<QuizSession>(
        `/skill-trees/${tree._id}/nodes/${node.id}/quiz`,
        { method: 'POST', body: JSON.stringify({ language: scenario.language }) },
        token,
      );

      if (index === 0 && scenario.failFirstQuiz) {
        const failed = await completeQuiz(token, tree._id, node.id, quiz, 'fail');
        result.quizAttempts.push({ nodeId: node.id, intended: 'fail', ...failed });
        quiz = await api<QuizSession>(
          `/skill-trees/${tree._id}/nodes/${node.id}/quiz`,
          { method: 'POST', body: JSON.stringify({ language: scenario.language }) },
          token,
        );
      }

      const passed = await completeQuiz(token, tree._id, node.id, quiz, 'pass');
      result.quizAttempts.push({ nodeId: node.id, intended: 'pass', ...passed });
      tree = await api<SkillTree>(`/skill-trees/${tree._id}`, { method: 'GET' }, token);
      result.completedNodes = tree.completedNodes ?? [];
    }

    result.pathAnalysis = await api<unknown>(`/skill-trees/${tree._id}/path-analysis`, { method: 'GET' }, token);
    await runChatProbe(token, tree._id, scenario.chatPrompt);
    result.status = 'passed';
  } catch (err) {
    result.error = (err as Error).message;
  }

  return result;
}

async function completeQuiz(
  token: string,
  treeId: string,
  nodeId: string,
  quiz: QuizSession,
  mode: 'fail' | 'pass',
): Promise<{ score: number; passed: boolean; expGained?: number }> {
  const quizAnswers = quiz.questions.map((question) => {
    if (mode === 'pass') return question.correctIndex;
    return (question.correctIndex + 1) % question.options.length;
  });
  return api(`/skill-trees/${treeId}/nodes/${nodeId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ quizSessionId: quiz.quizSessionId, quizAnswers }),
  }, token);
}

async function runChatProbe(token: string, skillTreeId: string, content: string) {
  const chat = await api<{ _id: string }>('/chats', {
    method: 'POST',
    body: JSON.stringify({ skillTreeId }),
  }, token);
  await rawFetch(`/chats/${chat._id}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  }, token);
}

function nextAvailableNode(tree: SkillTree): SkillNode | undefined {
  const completed = new Set(tree.completedNodes ?? []);
  return [...tree.nodes]
    .sort((a, b) => a.level - b.level)
    .find((node) => !completed.has(node.id) && node.prerequisites.every((id) => completed.has(id)));
}

async function waitForReady(token: string, treeId: string): Promise<SkillTree> {
  const started = Date.now();
  while (Date.now() - started < generationTimeoutMs) {
    const tree = await api<SkillTree>(`/skill-trees/${treeId}`, { method: 'GET' }, token);
    if (tree.status === 'ready') return tree;
    if (tree.status === 'failed') throw new Error(`Skill tree generation failed: ${tree.errorMessage ?? 'unknown error'}`);
    await delay(2000);
  }
  throw new Error(`Timed out waiting for skill tree ${treeId}`);
}

async function api<T>(path: string, init: RequestInit, token?: string): Promise<T> {
  const response = await rawFetch(path, init, token);
  const payload = await response.json() as ApiResponse<T>;
  if (!response.ok || payload.success === false) {
    throw new Error(`${response.status} ${payload.message ?? response.statusText}`);
  }
  return payload.data;
}

async function rawFetch(path: string, init: RequestInit, token?: string) {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${text || response.statusText}`);
  }
  return response;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
