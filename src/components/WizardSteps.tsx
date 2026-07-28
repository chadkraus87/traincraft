export default function WizardSteps({ current }: { current: 1 | 2 | 3 | 4 }) {
  const steps = ["Basics", "Limitations", "Equipment", "Done"];
  return (
    <div className="flex items-center gap-2 mb-4 text-xs">
      {steps.map((label, i) => {
        const step = (i + 1) as 1 | 2 | 3 | 4;
        const active = step === current;
        const done = step < current;
        return (
          <div key={label} className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full ${active ? "bg-coral text-[#1C1005] font-medium" : done ? "bg-success/20 text-success" : "bg-steel/10 text-steel"}`}>
              {step}. {label}
            </span>
            {i < steps.length - 1 && <span className="text-steel">→</span>}
          </div>
        );
      })}
    </div>
  );
}
