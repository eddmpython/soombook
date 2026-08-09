export const BOOK_PACK_FORMAT_VERSION = '1.0.0';

export type ContentStatus = 'fixture' | 'internal' | 'review' | 'published' | 'withdrawn';

export type ReadingMode = 'direct' | 'guided' | 'listen';

export type InputAdapter = 'lens' | 'regionTap' | 'keyboard' | 'linearExplore';

export type HintStepKind = 'word' | 'direction' | 'area' | 'direct';

export type SceneKind = 'cover' | 'investigation' | 'reasoning' | 'connection';

export type TruthStatus =
  'fiction' | 'fixture' | 'unverifiedClaim' | 'verifiedSource' | 'derivedFromVerifiedSource';

export type SceneDecoration =
  'moon' | 'mountains' | 'pine' | 'tiger' | 'child' | 'lantern' | 'stoneWall' | 'ribbons';

export interface CompletionRecallCard {
  id: string;
  text: string;
}

export interface CompletionTreasureCard {
  interactionId: string;
  title: string;
  body: string;
}

export interface CompletionRule {
  requiredConnectionIds: string[];
  requiredInteractionIds: string[];
  requiredReasoningIds: string[];
  review: {
    recallPrompt: string;
    recallCards: CompletionRecallCard[];
    treasure: CompletionTreasureCard;
  };
}

export interface BookManifest {
  formatVersion: typeof BOOK_PACK_FORMAT_VERSION;
  packVersion: string;
  id: string;
  slug: string;
  title: string;
  status: ContentStatus;
  locale: 'ko-KR';
  minReaderVersion: string;
  entrySceneId: string;
  sceneOrder: string[];
  completion: CompletionRule;
}

export interface BookMetadata {
  audience: {
    grade: 3;
    independentReadingMinutes: number;
  };
  summary: string;
  learningGoals: string[];
  readingModes: ReadingMode[];
  privacy: {
    childAccountRequired: false;
    remoteTelemetryDefault: false;
  };
}

export interface SceneVisual {
  motif: 'paper' | 'painting' | 'moon' | 'museum';
  palette: 'ink' | 'indigo' | 'amber' | 'jade';
  alt: string;
  truthStatus?: TruthStatus;
  decorations?: SceneDecoration[];
  baseAssetId?: string;
  detailAssetId?: string;
}

export interface TextBlock {
  id: string;
  heading?: string;
  body: string;
}

export interface Scene {
  id: string;
  kind: SceneKind;
  title: string;
  shortLabel: string;
  instruction: string;
  narration: string;
  visual: SceneVisual;
  textBlocks: TextBlock[];
  interactionIds: string[];
  reasoningIds: string[];
  connectionIds: string[];
}

export interface Interaction {
  id: string;
  sceneId: string;
  kind: 'findClue';
  prompt: string;
  accessibleName: string;
  inputAdapters: InputAdapter[];
  pointerTarget?: InteractionPointerTarget;
  choices: ReasoningChoice[];
  correctChoiceId: string;
  successFeedback: string;
  retryFeedback: string;
  unlockTextIds: string[];
  hintSteps: HintStep[];
  completion: {
    minimumDiscoveries: number;
  };
}

export interface InteractionPointerTarget {
  shape: 'ellipse';
  centerXPercent: number;
  centerYPercent: number;
  radiusXPercent: number;
  radiusYPercent: number;
}

export interface HintStep {
  kind: HintStepKind;
  text: string;
}

export interface ReasoningChoice {
  id: string;
  label: string;
}

export interface ReasoningPrompt {
  id: string;
  sceneId: string;
  prompt: string;
  choices: ReasoningChoice[];
  correctChoiceId: string;
  evidenceInteractionIds: string[];
  successFeedback: string;
  retryFeedback: string;
}

export interface ConnectionCard {
  id: string;
  sceneId: string;
  title: string;
  body: string;
  sourceClaimIds: string[];
  truthStatus?: TruthStatus;
  sourcePresentation?: SourcePresentation;
}

export interface SourcePresentation {
  institution: string;
  identifier: string | null;
  sourceUrl: string;
  license: string;
  attribution: string;
}

export interface SourceSnapshot {
  status: 'pending' | 'captured';
  evidenceRef: string;
  sha256: string | null;
  capturedAt: string | null;
}

export interface RightsProvenance {
  sourceInstitution: string;
  sourceIdentifier: string | null;
  licenseUrl: string | null;
  transformations: string[];
  derivedFromAssetIds: string[];
  sourceSnapshot: SourceSnapshot;
  approvalEvidenceDigest: string | null;
  ingestReceiptDigest: string | null;
  approvalLifecycle: {
    state: 'pending' | 'active' | 'suspended' | 'withdrawn';
    nextReviewAt: string | null;
  };
  recheckTriggers: string[];
  verifiedSourceFiles?: Array<{
    sourceCandidateId: string;
    sourceSha256: string;
    sourceEvidenceRef: string;
  }>;
}

export interface RightsRecord {
  id: string;
  subjectType: 'text' | 'visual' | 'audio' | 'claim';
  subjectId: string;
  license: string;
  sourceUrl: string | null;
  attribution: string;
  commercialUse: boolean;
  modificationAllowed: boolean;
  approvalStatus: 'fixture' | 'pending' | 'approved' | 'rejected' | 'suspended' | 'withdrawn';
  notes: string;
  coveredSubjectIds?: string[];
  provenance?: RightsProvenance;
}

export type ClaimKind =
  | 'fixture'
  | 'fictionEvent'
  | 'storyInterpretation'
  | 'educationalFact'
  | 'museumMetadata'
  | 'licenseStatement'
  | 'safetyStatement';

export type ClaimScope =
  | 'fixture'
  | 'storyOnly'
  | 'storySimplification'
  | 'objectOnly'
  | 'genreInterpretation'
  | 'licenseOnly';

export interface ClaimRecord {
  id: string;
  statement: string;
  sourceTitle: string;
  sourceUrl: string | null;
  checkedAt: string;
  reviewStatus: 'fixture' | 'pending' | 'approved' | 'rejected';
  kind?: ClaimKind;
  scope?: ClaimScope;
  caveats?: string[];
  sourceEvidenceRefs?: string[];
  audienceTextRefs?: string[];
  recheckTriggers?: string[];
}

export type AssetRole =
  | 'storyIllustration'
  | 'sourceOriginal'
  | 'sourceDetail'
  | 'narrationAudio'
  | 'fixtureTiming'
  | 'ui';

export interface VerifiedSourceLineage {
  sourceCandidateId: string;
  sourceSha256: string;
  sourceEvidenceRef: string;
  derivativePlanDigest: string;
  ingestReceiptDigest: string;
}

export interface AssetRecord {
  id: string;
  kind: 'cssArtwork' | 'image' | 'audio' | 'font';
  path: string | null;
  rightsRecordId: string;
  integrity: string | null;
  alt: string;
  role?: AssetRole;
  truthStatus?: TruthStatus;
  derivedFromAssetIds?: string[];
  sourceLineage?: VerifiedSourceLineage;
}

export interface AudioSegment {
  id: string;
  textId: string;
  startMs: number;
  endMs: number;
}

export interface AudioTrack {
  id: string;
  sceneId: string;
  assetId: string;
  durationMs: number;
  segments: AudioSegment[];
}

export type ReviewDomain = 'rights' | 'culture' | 'education' | 'audio' | 'accessibility';

export type ReviewSubjectType = 'pack' | 'rights' | 'claim' | 'asset' | 'audioTrack';

export interface ReviewRecord {
  id: string;
  domain: ReviewDomain;
  subjectType: ReviewSubjectType;
  subjectId: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewerRef: string | null;
  reviewedAt: string | null;
  subjectDigest: string | null;
  packVersion: string;
  notes: string;
}

export interface BookPack {
  manifest: BookManifest;
  book: BookMetadata;
  scenes: Scene[];
  interactions: Interaction[];
  reasoningPrompts: ReasoningPrompt[];
  connectionCards: ConnectionCard[];
  rights: RightsRecord[];
  claims: ClaimRecord[];
  assets: AssetRecord[];
  audioTracks: AudioTrack[];
  reviewRecords?: ReviewRecord[];
}

export type ValidationProfile = 'fixture' | 'review' | 'publish';

export interface VerifiedRightsEvidenceProjection {
  approvalEvidenceDigest: string;
  ingestReceiptDigest: string | null;
  nextReviewAt: string;
  state: 'active' | 'suspended' | 'withdrawn';
}

export interface BookPackValidationContext {
  releaseAt: string;
  rightsEvidence: readonly VerifiedRightsEvidenceProjection[];
}

export interface ValidationIssue {
  code: string;
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}
