import { describe, expect, it } from 'vitest';

import { createDemoBookPack } from './createDemoBookPack';

describe('createDemoBookPack', () => {
  it('호출마다 독립된 BookPack을 만든다', () => {
    const first = createDemoBookPack();
    const second = createDemoBookPack();

    first.scenes[0]!.title = '변경된 제목';

    expect(second.scenes[0]!.title).toBe('빈 그림의 초대');
  });

  it('초3 수직 절편의 본문 분량을 350자에서 650자로 유지한다', () => {
    const pack = createDemoBookPack();
    const storyLength = pack.scenes
      .flatMap((scene) => [scene.narration, ...scene.textBlocks.map((block) => block.body)])
      .join('').length;

    expect(storyLength).toBeGreaterThanOrEqual(350);
    expect(storyLength).toBeLessThanOrEqual(650);
  });

  it('발견 전에는 꼬리 정답을 누설하지 않고 세 길을 비교하게 한다', () => {
    const pack = createDemoBookPack();
    const scene = pack.scenes.find((candidate) => candidate.id === 'scene-search');
    const interaction = pack.interactions.find(
      (candidate) => candidate.id === 'interaction-find-tail',
    );
    if (!scene || !interaction) {
      throw new Error('찾기 장면 fixture가 없습니다.');
    }
    const lockedTextIds = new Set(interaction.unlockTextIds);
    const textBeforeDiscovery = [
      scene.instruction,
      scene.narration,
      scene.visual.alt,
      interaction.prompt,
      interaction.accessibleName,
      ...scene.textBlocks
        .filter((block) => !lockedTextIds.has(block.id))
        .map((block) => block.body),
    ].join(' ');

    expect(textBeforeDiscovery).not.toMatch(/줄무늬|꼬리|바위 뒤/u);
    expect(interaction.choices).toHaveLength(3);
    expect(interaction.choices.map((choice) => choice.label)).toEqual(
      expect.arrayContaining([expect.stringContaining('연못'), expect.stringContaining('마을')]),
    );
  });

  it('호랑이 장면의 fallback과 pointer geometry를 BookPack에 둔다', () => {
    const pack = createDemoBookPack();
    const scene = pack.scenes.find((candidate) => candidate.id === 'scene-search');

    expect(scene?.visual.decorations).toEqual(['moon', 'mountains', 'pine', 'tiger']);
    expect(pack.interactions[0]?.pointerTarget).toMatchObject({
      centerXPercent: 75,
      centerYPercent: 66,
    });
  });
});
