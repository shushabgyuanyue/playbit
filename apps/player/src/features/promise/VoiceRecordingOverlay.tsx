import { createPortal } from "react-dom";
import { useContext } from "react";
import { OverlayContainer } from "../../components/ui/Sheet";
import { VoiceWave } from "./VoiceNoteButton";

export function VoiceRecordingOverlay({ open, arming, label, recordingLabel }: {
  open: boolean;
  arming: boolean;
  label: string;
  recordingLabel: string;
}) {
  const container = useContext(OverlayContainer);
  if (!open || !container) return null;

  return createPortal(<div
    className={`voice-recording-overlay ${arming ? "is-arming" : "is-recording"}`}
    role="status"
    aria-live="polite"
    aria-label={arming ? label : recordingLabel}
  >
    <div className="stake-recording-focus" aria-hidden="true">
      <span className="stake-recording-charge" />
      <span className="stake-recording-wave"><VoiceWave tone="stake" active /></span>
    </div>
    <span className="stake-recording-status">{arming ? label : recordingLabel}</span>
  </div>, container);
}
