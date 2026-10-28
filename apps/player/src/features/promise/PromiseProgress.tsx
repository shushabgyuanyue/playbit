import { playerCopy as copy } from "@playbit/content/player";
import { Icon } from "../../components/ui/Icon";

export function PromiseProgress({ activeStep, onRestart, disabled = false }: { activeStep: number; onRestart: () => void; disabled?: boolean }) {
  return <div className="bet-progress has-restart" aria-label={copy.promise.steps[activeStep]}>
    <button className="restart-step" type="button" disabled={disabled} onClick={onRestart} title={copy.promise.restart}>
      <i><Icon name="restart" size={13} /></i>{copy.promise.restart}
    </button>
    {copy.promise.steps.map((step, index) => <span className={index <= activeStep ? "active" : ""} key={step} aria-current={index === activeStep ? "step" : undefined}>
      <i>{index < activeStep ? <Icon name="check" size={10} /> : index + 1}</i>{step}
    </span>)}
  </div>;
}
