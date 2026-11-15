export type Status = "idle" | "loading" | "active" | "error" | "done";

export interface MetadataTrace {
  key: string;
  value: string;
  category: "location" | "device" | "time" | "software" | "identity" | "other";
}

export type FileKind = "image" | "video" | "audio" | "pdf" | "other";
