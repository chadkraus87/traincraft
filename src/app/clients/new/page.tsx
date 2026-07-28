import { createClientForOnboarding } from "../actions";
import WizardSteps from "@/components/WizardSteps";

export default function NewClientWizardStart() {
  return (
    <div className="max-w-xl mx-auto">
      <h1 className="display text-3xl mb-2">Add a client — guided setup</h1>
      <WizardSteps current={1} />
      <p className="text-sm text-steel mb-4">
        A short walkthrough: basics, then limitations, then equipment, then straight into building their first plan. Prefer to just add someone quickly? <a href="/clients" className="text-coral underline">Use the quick-add form instead.</a>
      </p>
      <form action={createClientForOnboarding} className="card space-y-3">
        <div><span className="label">Full name</span><input name="full_name" required className="input" /></div>
        <div><span className="label">Email</span><input name="email" type="email" className="input" /></div>
        <div><span className="label">Phone (optional)</span><input name="phone" className="input" placeholder="(512) 555-0100" /></div>
        <div><span className="label">Goals</span><input name="goals" className="input" placeholder="Fat loss, first pull-up" /></div>
        <div><span className="label">Training history / notes</span><textarea name="training_history" rows={3} className="input" /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_remote" /> Remote client (home equipment only)</label>
        <button className="btn w-full justify-center">Continue → Limitations</button>
      </form>
    </div>
  );
}
