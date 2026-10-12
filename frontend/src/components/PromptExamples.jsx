import React from 'react';

// These are draft prompts. They supply context without asserting a saved record or upload.
export default function PromptExamples({ label, setPrompt, disabled = false }) {
  const subject = label.replace(/^No /i, '').replace(/[-–]/g, ' ');
  const examples = [
    ['Quick assessment', `For a fictional moving company, assess ${subject}. A customer is planning a two-bedroom local move next month. Identify the information to confirm, likely constraints, and next steps. Do not assume an existing customer record.`],
    ['Operations plan', `Draft an operations plan for ${subject} using a fictional three-bedroom move with one flight of stairs, a reserved loading window, and fragile artwork. Include a checklist, owner actions, dependencies, and open questions. Treat all details as illustrative.`],
    ['Detailed review', `Review ${subject} for a fictional long-distance move involving storage, packing, and a piano. Provide risks, practical mitigations, a timeline, and the evidence needed before any decision. Clearly distinguish assumptions from verified facts.`],
  ];
  return <div aria-label="Prompt examples" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
    {examples.map(([name, prompt]) => <button key={name} type="button" disabled={disabled} onClick={() => setPrompt(prompt)} style={{ padding: '8px 12px', border: '1px solid #93c5fd', borderRadius: 8, color: '#1e3a8a', background: '#fff' }}>Fill prompt · {name}</button>)}
  </div>;
}
