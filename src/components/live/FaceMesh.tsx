import Badge from "@/components/ui/Badge";
import StatusDot from "@/components/ui/StatusDot";
import { COPY } from "@/lib/constants";

/** Face tracking status chip. Shows "Cloaked" only while a face is actually being tracked and masked. */
export default function FaceStatus({ cameraOn, tracking }: { cameraOn: boolean; tracking: boolean }) {
  if (!cameraOn) return <Badge>Face: Off</Badge>;
  return (
    <Badge tone={tracking ? "success" : "danger"}>
      <StatusDot tone={tracking ? "active" : "error"} />
      {tracking ? COPY.faceCloaked : "Face: Searching (frame hidden)"}
    </Badge>
  );
}
