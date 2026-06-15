import { buildQuizPrompt } from './quiz.prompt';

describe('buildQuizPrompt', () => {
  it('includes personalized context when provided', () => {
    const prompt = buildQuizPrompt(
      'Components',
      'Learn Vue components',
      'Learn Vue',
      'en-US',
      'Past mistake about props',
    );

    expect(prompt).toContain('Personalized context');
    expect(prompt).toContain('Past mistake about props');
    expect(prompt).toContain('explanation');
  });

  it('omits personalized context when none is provided', () => {
    const prompt = buildQuizPrompt('组件', '学习 Vue 组件', '学习 Vue', 'zh-CN');

    expect(prompt).not.toContain('个性化上下文');
    expect(prompt).toContain('explanation');
  });
});
