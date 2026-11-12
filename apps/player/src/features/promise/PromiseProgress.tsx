import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "../../components/ui/Icon";

export function PromiseProgress({ activeStep, onRestart, disabled = false }: { activeStep: number; onRestart: () => void; disabled?: boolean }) {
  const currentStep = Math.min(activeStep, copy.promise.steps.length - 1);
  return <div className="promise-progress" aria-label={copy.promise.progressLabel}>
    <div className="promise-progress-heading">
      <span>{copy.promise.stepCount(currentStep + 1, copy.promise.steps.length)}</span>
      <b>{copy.promise.steps[currentStep]}</b>
      <button type="button" disabled={disabled} onClick={onRestart} aria-label={copy.promise.restart} title={copy.promise.restart}>
        <Icon name="restart" size={16} />
      </button>
    </div>
    <div className="promise-progress-track" aria-hidden="true">
      {copy.promise.steps.map((step, index) => <i className={index <= currentStep ? "active" : ""} key={step} />)}
    </div>
  </div>;
}
