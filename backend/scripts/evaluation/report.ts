import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

async function main() {
  const outputDir = join(__dirname, '..', '..', 'evaluation-results');
  const inputPath = process.argv[2] ?? await findLatestJson(outputDir);
  const raw = await readFile(inputPath, 'utf-8');
  const data = JSON.parse(raw);
  const summary = data.summary ?? {};
  const scenarioResults = data.scenarioResults ?? [];
  const passed = scenarioResults.filter((item: any) => item.status === 'passed').length;

  const markdown = [
    '# Evaluation Run Report',
    '',
    `- API: ${data.apiBase}`,
    `- User: ${data.username}`,
    `- Started: ${data.startedAt}`,
    `- Finished: ${data.finishedAt}`,
    `- Scenarios: ${passed}/${scenarioResults.length} passed`,
    '',
    '## Summary',
    '',
    `- Skill trees: ${summary.totalSkillTrees ?? 0}`,
    `- Generation success rate: ${summary.generationSuccessRate ?? 0}%`,
    `- DAG validity rate: ${summary.dagValidityRate ?? 0}%`,
    `- Average LCS score: ${summary.averageLcsSimilarityScore ?? 0}`,
    `- Quiz pass rate: ${summary.quizPassRate ?? 0}%`,
    `- RAG hit rate: ${summary.ragHitRate ?? 0}%`,
    `- Earned EXP: ${summary.totalEarnedExp ?? 0}`,
    `- Path bonus EXP: ${summary.totalPathBonusExp ?? 0}`,
    `- Badges: ${summary.userBadgeCount ?? 0}`,
    '',
    '## Scenarios',
    '',
    ...scenarioResults.flatMap((item: any) => [
      `### ${item.scenarioId}`,
      '',
      `- Status: ${item.status}`,
      `- Skill tree: ${item.skillTreeId ?? '-'}`,
      `- Completed nodes: ${(item.completedNodes ?? []).length}`,
      `- Quiz attempts: ${(item.quizAttempts ?? []).length}`,
      ...(item.error ? [`- Error: ${item.error}`] : []),
      '',
    ]),
  ].join('\n');

  const reportPath = inputPath.replace(/\.json$/, '.md');
  await writeFile(reportPath, markdown, 'utf-8');
  console.log(`Evaluation report written: ${reportPath}`);
}

async function findLatestJson(outputDir: string) {
  const files = await readdir(outputDir);
  const jsonFiles = files.filter((file) => file.endsWith('.json')).sort();
  const latest = jsonFiles.at(-1);
  if (!latest) throw new Error(`No evaluation JSON files found in ${outputDir}`);
  return join(outputDir, latest);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
