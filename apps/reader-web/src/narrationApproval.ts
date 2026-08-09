import type { AudioTrack, BookPack } from '@soombook/book-schema';

export function approvedAudioMayCompleteReading(pack: BookPack, track: AudioTrack): boolean {
  if (pack.manifest.status !== 'published') return false;
  const asset = pack.assets.find((candidate) => candidate.id === track.assetId);
  if (!asset || asset.kind !== 'audio') return false;
  const rights = pack.rights.find((record) => record.id === asset.rightsRecordId);
  return Boolean(
    rights &&
    rights.subjectType === 'audio' &&
    rights.subjectId === asset.id &&
    rights.approvalStatus === 'approved',
  );
}
