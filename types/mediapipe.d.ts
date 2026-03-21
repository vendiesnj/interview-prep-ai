declare module "@mediapipe/tasks-vision" {
  export class FilesetResolver {
    static forVisionTasks(wasmPath: string): Promise<any>;
  }

  export class FaceLandmarker {
    static createFromOptions(vision: any, options: any): Promise<FaceLandmarker>;
    detectForVideo(video: HTMLVideoElement, timestamp: number): FaceLandmarkerResult;
    close(): void;
  }

  export interface FaceLandmarkerResult {
    faceLandmarks: Array<Array<{ x: number; y: number; z: number }>>;
    faceBlendshapes?: any[];
    facialTransformationMatrixes?: any[];
  }
}
