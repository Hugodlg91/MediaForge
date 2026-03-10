import { VideoConverter } from "./VideoConverter";
import { AudioConverter } from "./AudioConverter";
import { ImageConverter } from "./ImageConverter";

type MediaType = "image" | "video" | "audio";

interface ConverterPageProps {
  type: MediaType;
}

export function ConverterPage({ type }: ConverterPageProps) {
  if (type === "image") return <ImageConverter />;
  if (type === "video") return <VideoConverter />;
  if (type === "audio") return <AudioConverter />;
  return null;
}
