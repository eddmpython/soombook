import {
  createBookRuntime,
  type BookRuntimeState,
  type JourneyStage,
  type MotionPreference,
  type TextScale,
} from '@soombook/book-runtime';
import type { BookPack, ReadingMode } from '@soombook/book-schema';

const STORAGE_PREFIX = 'soombook.runtime';
const LOCAL_PROFILE_SLOT = 'local-default';
const STORAGE_VERSION = 4;
const PREVIOUS_STORAGE_VERSION = 3;
const LEGACY_STORAGE_VERSION = 2;
type StoredRuntimeStatus = Exclude<BookRuntimeState['status'], 'reflecting'>;
const VALID_STATUSES = new Set<StoredRuntimeStatus>(['ready', 'reading', 'completed']);
const VALID_TEXT_SCALES = new Set<TextScale>(['default', 'large']);
const VALID_MOTION_PREFERENCES = new Set<MotionPreference>(['system', 'reduced']);

interface StoredProgressFields {
  bookId: string;
  packVersion: string;
  status: StoredRuntimeStatus;
  completionPhase?: 'reflecting';
  currentSceneId: string;
  consumedTextIds: string[];
  completedInteractionIds: string[];
  completedReasoningIds: string[];
  openedConnectionIds: string[];
}

interface StoredRuntimeProgress extends StoredProgressFields {
  storageVersion: typeof STORAGE_VERSION;
  profileSlot: typeof LOCAL_PROFILE_SLOT;
  textScale: TextScale;
  motionPreference: MotionPreference;
  readingMode: ReadingMode;
}

interface PreviousStoredRuntimeProgress extends StoredProgressFields {
  storageVersion: typeof PREVIOUS_STORAGE_VERSION;
  profileSlot: typeof LOCAL_PROFILE_SLOT;
  textScale: TextScale;
  motionPreference: MotionPreference;
}

interface LegacyStoredRuntimeProgress extends StoredProgressFields {
  storageVersion: typeof LEGACY_STORAGE_VERSION;
  readingMode: ReadingMode;
}

function storageKey(pack: BookPack): string {
  return `${STORAGE_PREFIX}.${LOCAL_PROFILE_SLOT}.${pack.manifest.id}.${pack.manifest.packVersion}`;
}

function legacyStorageKey(pack: BookPack): string {
  return `${STORAGE_PREFIX}.${pack.manifest.id}`;
}

function isAllowedStringArray(value: unknown, allowedIds: Set<string>): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((entry) => typeof entry === 'string' && allowedIds.has(entry)) &&
    new Set(value).size === value.length
  );
}

function includesEvery(values: string[], required: string[]): boolean {
  return required.every((value) => values.includes(value));
}

function progressIsConsistent(progress: StoredProgressFields, pack: BookPack): boolean {
  if (progress.status === 'ready') {
    return (
      progress.currentSceneId === pack.manifest.entrySceneId &&
      progress.consumedTextIds.length === 0 &&
      progress.completedInteractionIds.length === 0 &&
      progress.completedReasoningIds.length === 0 &&
      progress.openedConnectionIds.length === 0
    );
  }

  const requiresFinishedStory =
    progress.status === 'completed' || progress.completionPhase === 'reflecting';
  if (!requiresFinishedStory) {
    return true;
  }
  const finalSceneId = pack.manifest.sceneOrder.at(-1);
  const finalScene = pack.scenes.find((scene) => scene.id === finalSceneId);
  return Boolean(
    finalScene &&
    progress.currentSceneId === finalSceneId &&
    finalScene.textBlocks.some((block) => progress.consumedTextIds.includes(block.id)) &&
    includesEvery(
      progress.completedInteractionIds,
      pack.manifest.completion.requiredInteractionIds,
    ) &&
    includesEvery(progress.completedReasoningIds, pack.manifest.completion.requiredReasoningIds) &&
    includesEvery(progress.openedConnectionIds, pack.manifest.completion.requiredConnectionIds),
  );
}

function hasValidProgressFields(
  candidate: Partial<StoredProgressFields>,
  pack: BookPack,
): candidate is StoredProgressFields {
  const sceneIds = new Set(pack.manifest.sceneOrder);
  const textIds = new Set(
    pack.scenes.flatMap((scene) => scene.textBlocks.map((block) => block.id)),
  );
  const interactionIds = new Set(pack.interactions.map((interaction) => interaction.id));
  const reasoningIds = new Set(pack.reasoningPrompts.map((prompt) => prompt.id));
  const connectionIds = new Set(pack.connectionCards.map((card) => card.id));

  return Boolean(
    candidate.bookId === pack.manifest.id &&
    candidate.packVersion === pack.manifest.packVersion &&
    candidate.status &&
    VALID_STATUSES.has(candidate.status) &&
    (candidate.completionPhase === undefined || candidate.completionPhase === 'reflecting') &&
    (candidate.completionPhase !== 'reflecting' || candidate.status === 'reading') &&
    typeof candidate.currentSceneId === 'string' &&
    sceneIds.has(candidate.currentSceneId) &&
    isAllowedStringArray(candidate.consumedTextIds, textIds) &&
    isAllowedStringArray(candidate.completedInteractionIds, interactionIds) &&
    isAllowedStringArray(candidate.completedReasoningIds, reasoningIds) &&
    isAllowedStringArray(candidate.openedConnectionIds, connectionIds),
  );
}

function decodeStoredProgress(value: unknown, pack: BookPack): StoredRuntimeProgress | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const candidate = value as Partial<StoredRuntimeProgress>;
  if (
    candidate.storageVersion !== STORAGE_VERSION ||
    candidate.profileSlot !== LOCAL_PROFILE_SLOT ||
    !candidate.textScale ||
    !VALID_TEXT_SCALES.has(candidate.textScale) ||
    !candidate.motionPreference ||
    !VALID_MOTION_PREFERENCES.has(candidate.motionPreference) ||
    !candidate.readingMode ||
    !pack.book.readingModes.includes(candidate.readingMode) ||
    !hasValidProgressFields(candidate, pack)
  ) {
    return null;
  }
  const progress = candidate as StoredRuntimeProgress;
  return progressIsConsistent(progress, pack) ? progress : null;
}

function decodePreviousProgress(value: unknown, pack: BookPack): StoredRuntimeProgress | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const candidate = value as Partial<PreviousStoredRuntimeProgress>;
  if (
    candidate.storageVersion !== PREVIOUS_STORAGE_VERSION ||
    candidate.profileSlot !== LOCAL_PROFILE_SLOT ||
    !candidate.textScale ||
    !VALID_TEXT_SCALES.has(candidate.textScale) ||
    !candidate.motionPreference ||
    !VALID_MOTION_PREFERENCES.has(candidate.motionPreference) ||
    !hasValidProgressFields(candidate, pack)
  ) {
    return null;
  }
  const previous = candidate as PreviousStoredRuntimeProgress;
  const migrated: StoredRuntimeProgress = {
    ...previous,
    storageVersion: STORAGE_VERSION,
    readingMode: 'direct',
  };
  return progressIsConsistent(migrated, pack) ? migrated : null;
}

function decodeLegacyProgress(value: unknown, pack: BookPack): StoredRuntimeProgress | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const candidate = value as Partial<LegacyStoredRuntimeProgress>;
  if (
    candidate.storageVersion !== LEGACY_STORAGE_VERSION ||
    !candidate.readingMode ||
    !['direct', 'guided', 'listen'].includes(candidate.readingMode) ||
    !hasValidProgressFields(candidate, pack)
  ) {
    return null;
  }
  const progress = candidate as LegacyStoredRuntimeProgress;
  const migrated: StoredRuntimeProgress = {
    ...progress,
    storageVersion: STORAGE_VERSION,
    profileSlot: LOCAL_PROFILE_SLOT,
    textScale: progress.readingMode === 'guided' ? 'large' : 'default',
    motionPreference: 'system',
    readingMode: 'direct',
  };
  return progressIsConsistent(migrated, pack) ? migrated : null;
}

function deriveJourneyStages(progress: StoredProgressFields): JourneyStage[] {
  const stages: JourneyStage[] = [];
  if (progress.status !== 'ready') stages.push('opened');
  if (progress.consumedTextIds.length > 0) stages.push('read');
  if (progress.completedInteractionIds.length > 0) stages.push('explored');
  if (progress.completedReasoningIds.length > 0) stages.push('reasoned');
  if (progress.openedConnectionIds.length > 0) stages.push('connected');
  if (progress.status === 'completed') stages.push('completed');
  return stages;
}

function restoreRuntime(pack: BookPack, progress: StoredRuntimeProgress): BookRuntimeState {
  const freshState = createBookRuntime(pack);
  return {
    ...freshState,
    status: progress.completionPhase === 'reflecting' ? 'reflecting' : progress.status,
    currentSceneId: progress.currentSceneId,
    currentSceneIndex: pack.manifest.sceneOrder.indexOf(progress.currentSceneId),
    textScale: progress.textScale,
    motionPreference: progress.motionPreference,
    readingMode: progress.readingMode,
    consumedTextIds: progress.consumedTextIds,
    completedInteractionIds: progress.completedInteractionIds,
    completedReasoningIds: progress.completedReasoningIds,
    openedConnectionIds: progress.openedConnectionIds,
    journeyStages: deriveJourneyStages(progress),
  };
}

export function loadRuntimeState(pack: BookPack): BookRuntimeState {
  const freshState = createBookRuntime(pack);
  try {
    const currentKey = storageKey(pack);
    const stored = localStorage.getItem(currentKey);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      const progress = decodeStoredProgress(parsed, pack) ?? decodePreviousProgress(parsed, pack);
      if (progress) {
        const restored = restoreRuntime(pack, progress);
        if (
          typeof parsed === 'object' &&
          parsed !== null &&
          'storageVersion' in parsed &&
          parsed.storageVersion === PREVIOUS_STORAGE_VERSION
        ) {
          saveRuntimeState(pack, restored);
        }
        return restored;
      }
      localStorage.removeItem(currentKey);
    }

    const legacy = localStorage.getItem(legacyStorageKey(pack));
    if (!legacy) {
      return freshState;
    }
    const migrated = decodeLegacyProgress(JSON.parse(legacy), pack);
    if (!migrated) {
      return freshState;
    }
    const restored = restoreRuntime(pack, migrated);
    saveRuntimeState(pack, restored);
    return restored;
  } catch {
    return freshState;
  }
}

function storedProgress(pack: BookPack, state: BookRuntimeState): StoredRuntimeProgress {
  return {
    storageVersion: STORAGE_VERSION,
    profileSlot: LOCAL_PROFILE_SLOT,
    bookId: pack.manifest.id,
    packVersion: pack.manifest.packVersion,
    status: state.status === 'reflecting' ? 'reading' : state.status,
    ...(state.status === 'reflecting' ? { completionPhase: 'reflecting' as const } : {}),
    currentSceneId: state.currentSceneId,
    textScale: state.textScale,
    motionPreference: state.motionPreference,
    readingMode: state.readingMode,
    consumedTextIds: state.consumedTextIds,
    completedInteractionIds: state.completedInteractionIds,
    completedReasoningIds: state.completedReasoningIds,
    openedConnectionIds: state.openedConnectionIds,
  };
}

function writeLegacyProjection(pack: BookPack, progress: StoredRuntimeProgress): void {
  const key = legacyStorageKey(pack);
  const existing = localStorage.getItem(key);
  if (existing) {
    try {
      const existingVersion = (JSON.parse(existing) as { packVersion?: unknown }).packVersion;
      if (typeof existingVersion === 'string' && existingVersion !== pack.manifest.packVersion) {
        return;
      }
    } catch {
      // 손상된 구버전 projection은 현재 정상 projection으로 교체한다.
    }
  }
  const legacy: LegacyStoredRuntimeProgress = {
    storageVersion: LEGACY_STORAGE_VERSION,
    bookId: progress.bookId,
    packVersion: progress.packVersion,
    status: progress.status,
    ...(progress.completionPhase ? { completionPhase: progress.completionPhase } : {}),
    currentSceneId: progress.currentSceneId,
    readingMode: progress.textScale === 'large' ? 'guided' : 'direct',
    consumedTextIds: progress.consumedTextIds,
    completedInteractionIds: progress.completedInteractionIds,
    completedReasoningIds: progress.completedReasoningIds,
    openedConnectionIds: progress.openedConnectionIds,
  };
  localStorage.setItem(key, JSON.stringify(legacy));
}

export function saveRuntimeState(pack: BookPack, state: BookRuntimeState): boolean {
  const progress = storedProgress(pack, state);
  try {
    localStorage.setItem(storageKey(pack), JSON.stringify(progress));
    try {
      writeLegacyProjection(pack, progress);
    } catch {
      // 현재 versioned projection이 성공했으면 구버전 mirror 실패는 읽기를 막지 않는다.
    }
    return true;
  } catch {
    return false;
  }
}

export function clearRuntimeState(pack: BookPack): boolean {
  try {
    const versionedPrefix = `${STORAGE_PREFIX}.${LOCAL_PROFILE_SLOT}.${pack.manifest.id}.`;
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(versionedPrefix)) {
        localStorage.removeItem(key);
      }
    }
    localStorage.removeItem(legacyStorageKey(pack));
    return true;
  } catch {
    return false;
  }
}

export function clearAllRuntimeState(): boolean {
  try {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(`${STORAGE_PREFIX}.`)) {
        localStorage.removeItem(key);
      }
    }
    return true;
  } catch {
    return false;
  }
}
