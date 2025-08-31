export enum RecordingStatus {
  IDLE,
  PREVIEW,
  RECORDING,
  PROCESSING,
  FINISHED,
}

export type AudioSource = 'tab' | 'tab_and_mic' | 'none';
