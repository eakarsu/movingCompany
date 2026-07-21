import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  applyLegalHold,
  createMatter,
  disposeDocument,
  exportMatter,
  extractDocument,
  generateDocument,
  getDocumentContent,
  getMatter,
  getUserDirectory,
  grantMatterAccess,
  listMatters,
  listTemplates,
  releaseLegalHold,
  requestFiling,
  requestSignature,
  reviewDocument,
  reviseDocument,
  revokeMatterAccess,
  syncTemplates,
  uploadDocument,
  verifyAudit,
} from '../api';

const documentTypes = ['EVIDENCE', 'CLAIM_FORM', 'SETTLEMENT_AGREEMENT', 'RELEASE', 'NOTICE', 'FILING_COVER_SHEET', 'OTHER'];
const revisionStates = new Set(['DRAFT', 'REVIEW_PENDING', 'REJECTED', 'APPROVED']);

function operationKey(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function errorMessage(error) {
  const body = error.response?.data;
  if (body?.code && body?.error) return `${body.error} (${body.code})`;
  return body?.error || error.message || 'Request failed';
}

async function fileToBase64(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let index = 0; index < bytes.length; index += 32_768) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 32_768));
  }
  return btoa(binary);
}

function Status({ children }) {
  const palette = children === 'FILED' || children === 'SIGNED' || children === 'APPROVED'
    ? 'bg-emerald-100 text-emerald-800'
    : children === 'REJECTED' || children === 'DISPOSED'
      ? 'bg-rose-100 text-rose-800'
      : 'bg-amber-100 text-amber-900';
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${palette}`}>{children}</span>;
}

function DocumentCard({ document, accessRole, busy, run }) {
  const [revisionFile, setRevisionFile] = useState(null);
  const [reviewComments, setReviewComments] = useState('Jurisdiction, effective date, and document language verified.');
  const [signer, setSigner] = useState({ name: '', email: '' });
  const [filingType, setFilingType] = useState('CLAIM_RELEASE');
  const [dispositionReason, setDispositionReason] = useState('Retention period completed; disposition was authorized.');
  const canWrite = ['OWNER', 'CONTRIBUTOR'].includes(accessRole);
  const isOwner = accessRole === 'OWNER';

  const revise = async (event) => {
    event.preventDefault();
    if (!revisionFile) return;
    await run('Adding document version', async () => reviseDocument(document.id, {
      expectedVersion: document.lockVersion,
      fileName: revisionFile.name,
      mimeType: revisionFile.type,
      contentBase64: await fileToBase64(revisionFile),
      idempotencyKey: operationKey('revision'),
    }));
    setRevisionFile(null);
  };

  const download = async () => {
    await run('Retrieving document', async () => {
      const response = await getDocumentContent(document.id);
      const url = URL.createObjectURL(response.data);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = `${document.title.replace(/[^A-Za-z0-9._-]+/g, '-')}-v${document.currentVersion}`;
      link.click();
      URL.revokeObjectURL(url);
      return response;
    });
  };

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-950">{document.title}</h3>
            <Status>{document.status}</Status>
            {document.privileged && <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-800">Privileged</span>}
          </div>
          <p className="mt-1 text-xs text-slate-500">{document.documentType.replaceAll('_', ' ')} · v{document.currentVersion} · lock {document.lockVersion}</p>
        </div>
        <div className="flex gap-2">
          {document.status !== 'DISPOSED' && <button className="btn-secondary text-sm" disabled={busy} onClick={download}>Download</button>}
          {canWrite && <button className="btn-secondary text-sm" disabled={busy} onClick={() => run('Running OCR', () => extractDocument(document.id, { idempotencyKey: operationKey('ocr') }))}>Run OCR</button>}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {canWrite && revisionStates.has(document.status) && (
          <form className="rounded-lg bg-slate-50 p-3" onSubmit={revise}>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Add immutable version</label>
            <input className="mt-2 block w-full text-sm" type="file" accept="application/pdf,text/plain,image/jpeg,image/png" onChange={(event) => setRevisionFile(event.target.files?.[0] || null)} required />
            <button className="btn-secondary mt-3 text-sm" disabled={busy || !revisionFile}>Add version</button>
          </form>
        )}

        {document.status === 'REVIEW_PENDING' && accessRole === 'LEGAL_REVIEWER' && (
          <form className="rounded-lg bg-slate-50 p-3" onSubmit={(event) => event.preventDefault()}>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Human legal review</label>
            <textarea className="input mt-2 min-h-20 text-sm" value={reviewComments} onChange={(event) => setReviewComments(event.target.value)} minLength={10} required />
            <div className="mt-3 flex gap-2">
              <button className="btn-success text-sm" disabled={busy} onClick={() => run('Approving document', () => reviewDocument(document.id, { expectedVersion: document.lockVersion, decision: 'APPROVED', comments: reviewComments }))}>Approve</button>
              <button className="btn-danger text-sm" disabled={busy} onClick={() => run('Rejecting document', () => reviewDocument(document.id, { expectedVersion: document.lockVersion, decision: 'REJECTED', comments: reviewComments }))}>Reject</button>
            </div>
          </form>
        )}

        {isOwner && document.status === 'APPROVED' && (
          <form className="rounded-lg bg-slate-50 p-3" onSubmit={(event) => {
            event.preventDefault();
            run('Requesting signature', () => requestSignature(document.id, { expectedVersion: document.lockVersion, signerName: signer.name, signerEmail: signer.email, idempotencyKey: operationKey('signature') }));
          }}>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Electronic signature</label>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <input className="input text-sm" value={signer.name} onChange={(event) => setSigner({ ...signer, name: event.target.value })} placeholder="Signer name" minLength={2} required />
              <input className="input text-sm" type="email" value={signer.email} onChange={(event) => setSigner({ ...signer, email: event.target.value })} placeholder="signer@example.com" required />
            </div>
            <button className="btn-primary mt-3 text-sm" disabled={busy}>Send for signature</button>
          </form>
        )}

        {isOwner && document.status === 'SIGNED' && (
          <form className="rounded-lg bg-slate-50 p-3" onSubmit={(event) => {
            event.preventDefault();
            run('Submitting filing', () => requestFiling(document.id, { expectedVersion: document.lockVersion, filingType, idempotencyKey: operationKey('filing') }));
          }}>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Jurisdiction filing</label>
            <input className="input mt-2 text-sm" value={filingType} onChange={(event) => setFilingType(event.target.value.toUpperCase())} pattern="[A-Za-z0-9][A-Za-z0-9_.:-]*" required />
            <button className="btn-primary mt-3 text-sm" disabled={busy}>Submit filing</button>
          </form>
        )}

        {isOwner && !['DISPOSED', 'DISPOSITION_PENDING'].includes(document.status) && (
          <form className="rounded-lg border border-rose-100 bg-rose-50 p-3" onSubmit={(event) => {
            event.preventDefault();
            run('Disposing document', () => disposeDocument(document.id, { expectedVersion: document.lockVersion, reason: dispositionReason, idempotencyKey: operationKey('disposition') }));
          }}>
            <label className="text-xs font-semibold uppercase tracking-wide text-rose-800">Retention disposition</label>
            <textarea className="input mt-2 min-h-20 text-sm" value={dispositionReason} onChange={(event) => setDispositionReason(event.target.value)} minLength={10} required />
            <button className="btn-danger mt-3 text-sm" disabled={busy}>Request disposition</button>
          </form>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
        <span>{document.versions?.length || 0} immutable version(s)</span>
        <span>{document.reviews?.length || 0} review(s)</span>
        <span>{document.extractions?.length || 0} OCR result(s)</span>
        <span>Retention: {document.retentionUntil ? new Date(document.retentionUntil).toLocaleDateString() : 'matter policy'}</span>
      </div>
    </article>
  );
}

export default function LegalDocuments() {
  const { user, logout } = useAuth();
  const [matters, setMatters] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [matter, setMatter] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState(null);
  const [matterForm, setMatterForm] = useState({ title: '', jurisdiction: 'NY', retentionUntil: '' });
  const [uploadForm, setUploadForm] = useState({ title: '', documentType: 'EVIDENCE', privileged: true, file: null });
  const [generationForm, setGenerationForm] = useState({ templateId: '', title: '', customerName: '', privileged: true });
  const [accessForm, setAccessForm] = useState({ userId: '', role: 'VIEWER', canViewPrivileged: false });
  const [holdReason, setHoldReason] = useState('Pending litigation or preservation request.');
  const [directory, setDirectory] = useState([]);

  const canManage = matter?.currentAccess?.role === 'OWNER';
  const canWriteDocuments = matter && ['OWNER', 'CONTRIBUTOR'].includes(matter.currentAccess?.role);
  const selectedTemplate = useMemo(() => templates.find((template) => template.id === generationForm.templateId), [templates, generationForm.templateId]);

  const refreshList = async (preferredId) => {
    const response = await listMatters();
    setMatters(response.data.matters);
    const nextId = preferredId || selectedId || response.data.matters[0]?.id || null;
    setSelectedId(nextId);
    return nextId;
  };

  const refreshMatter = async (matterId = selectedId) => {
    if (!matterId) {
      setMatter(null);
      setTemplates([]);
      return;
    }
    const [matterResponse, templateResponse] = await Promise.all([getMatter(matterId), listTemplates(matterId)]);
    setMatter(matterResponse.data.matter);
    setTemplates(templateResponse.data.templates);
    setGenerationForm((current) => ({ ...current, templateId: current.templateId || templateResponse.data.templates[0]?.id || '' }));
  };

  useEffect(() => {
    setBusy('Loading matters');
    refreshList()
      .catch((error) => setNotice({ type: 'error', text: errorMessage(error) }))
      .finally(() => setBusy(''));
  }, []);

  useEffect(() => {
    if (!['ADMIN', 'MANAGER'].includes(user.role)) return;
    getUserDirectory()
      .then((response) => setDirectory(response.data.users))
      .catch((error) => setNotice({ type: 'error', text: errorMessage(error) }));
  }, [user.role]);

  useEffect(() => {
    if (!selectedId) return;
    setBusy('Loading matter');
    refreshMatter(selectedId)
      .catch((error) => setNotice({ type: 'error', text: errorMessage(error) }))
      .finally(() => setBusy(''));
  }, [selectedId]);

  const run = async (label, action, options = {}) => {
    setBusy(label);
    setNotice(null);
    try {
      const result = await action();
      if (options.refresh !== false) {
        await refreshList(options.preferredId || selectedId);
        await refreshMatter(options.preferredId || selectedId);
      }
      setNotice({ type: 'success', text: `${label} completed.` });
      return result;
    } catch (error) {
      setNotice({ type: 'error', text: errorMessage(error) });
      return null;
    } finally {
      setBusy('');
    }
  };

  const createNewMatter = async (event) => {
    event.preventDefault();
    const result = await run('Opening matter', () => createMatter({
      title: matterForm.title,
      jurisdiction: matterForm.jurisdiction.toUpperCase(),
      ...(matterForm.retentionUntil ? { retentionUntil: `${matterForm.retentionUntil}T00:00:00.000Z` } : {}),
      idempotencyKey: operationKey('matter'),
    }), { refresh: false });
    if (result) {
      setMatterForm({ title: '', jurisdiction: 'NY', retentionUntil: '' });
      await refreshList(result.data.matter.id);
      setSelectedId(result.data.matter.id);
    }
  };

  const upload = async (event) => {
    event.preventDefault();
    const file = uploadForm.file;
    if (!file) return;
    await run('Uploading document', async () => uploadDocument(matter.id, {
      title: uploadForm.title,
      documentType: uploadForm.documentType,
      privileged: uploadForm.privileged,
      mimeType: file.type,
      fileName: file.name,
      contentBase64: await fileToBase64(file),
      idempotencyKey: operationKey('upload'),
    }));
    setUploadForm({ title: '', documentType: 'EVIDENCE', privileged: true, file: null });
  };

  const downloadExport = async () => {
    await run('Exporting matter', async () => {
      const response = await exportMatter(matter.id);
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${matter.matterNumber}-export.json`;
      link.click();
      URL.revokeObjectURL(url);
      return response;
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-800 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-400">Moving Company</p>
            <h1 className="text-xl font-semibold">Claim document control</h1>
          </div>
          <div className="text-right text-sm">
            <p>{user.firstName} {user.lastName} · {user.role}</p>
            <button className="mt-1 text-xs text-blue-300 hover:text-blue-100" onClick={logout}>Sign out and revoke sessions</button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-5 p-5 xl:grid-cols-[340px_1fr]">
        <aside className="space-y-5">
          <section className="card">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Matters</h2>
              <button className="text-sm text-blue-700" disabled={Boolean(busy)} onClick={() => run('Refreshing matters', () => refreshList(), { refresh: false })}>Refresh</button>
            </div>
            <div className="mt-3 space-y-2">
              {matters.map((item) => (
                <button key={item.id} className={`w-full rounded-lg border p-3 text-left ${selectedId === item.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`} onClick={() => setSelectedId(item.id)}>
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.matterNumber} · {item.jurisdiction} · {item._count.documents} docs</p>
                </button>
              ))}
              {!matters.length && <p className="py-4 text-sm text-slate-500">No accessible matters.</p>}
            </div>
          </section>

          {['ADMIN', 'MANAGER'].includes(user.role) && (
            <form className="card space-y-3" onSubmit={createNewMatter}>
              <h2 className="font-semibold">Open a matter</h2>
              <input className="input" value={matterForm.title} onChange={(event) => setMatterForm({ ...matterForm, title: event.target.value })} placeholder="Matter title" minLength={3} required />
              <input className="input uppercase" value={matterForm.jurisdiction} onChange={(event) => setMatterForm({ ...matterForm, jurisdiction: event.target.value })} placeholder="NY" pattern="[A-Za-z]{2}(-[A-Za-z0-9]{1,12})?" required />
              <label className="block text-xs text-slate-600">Retention through<input className="input mt-1" type="date" value={matterForm.retentionUntil} onChange={(event) => setMatterForm({ ...matterForm, retentionUntil: event.target.value })} /></label>
              <button className="btn-primary w-full" disabled={Boolean(busy)}>Open matter</button>
            </form>
          )}
        </aside>

        <main className="min-w-0 space-y-5">
          {notice && <div className={`rounded-lg border p-3 text-sm ${notice.type === 'error' ? 'border-rose-300 bg-rose-50 text-rose-900' : 'border-emerald-300 bg-emerald-50 text-emerald-900'}`}>{notice.text}</div>}
          {busy && <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900" role="status">{busy}…</div>}

          {!matter && <section className="card"><h2 className="text-xl font-semibold">Choose or open a matter</h2><p className="mt-2 text-slate-600">Every document action is matter-scoped, versioned, and audited.</p></section>}

          {matter && (
            <>
              <section className="card">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-semibold">{matter.title}</h2><Status>{matter.status}</Status>{matter.legalHold && <span className="badge-red badge">Legal hold</span>}</div>
                    <p className="mt-2 text-sm text-slate-600">{matter.matterNumber} · {matter.jurisdiction} · matter version {matter.version} · access {matter.currentAccess.role}</p>
                    {matter.privilegedDocumentsRedacted > 0 && <p className="mt-2 text-sm font-medium text-violet-800">{matter.privilegedDocumentsRedacted} privileged document(s) omitted for this role.</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-secondary text-sm" disabled={Boolean(busy)} onClick={downloadExport}>Export manifest</button>
                    <button className="btn-secondary text-sm" disabled={Boolean(busy)} onClick={async () => {
                      const result = await run('Verifying audit chain', () => verifyAudit(matter.id), { refresh: false });
                      if (result) setNotice({ type: result.data.valid ? 'success' : 'error', text: result.data.valid ? `Audit chain valid (${result.data.count} events).` : `Audit chain failed at event ${result.data.eventId}.` });
                    }}>Verify audit</button>
                  </div>
                </div>

                {canManage && (
                  <div className="mt-5 grid gap-3 border-t border-slate-200 pt-5 lg:grid-cols-[1fr_auto]">
                    <textarea className="input min-h-20" value={holdReason} onChange={(event) => setHoldReason(event.target.value)} minLength={10} />
                    <button className={matter.legalHold ? 'btn-secondary' : 'btn-danger'} disabled={Boolean(busy)} onClick={() => run(matter.legalHold ? 'Releasing legal hold' : 'Applying legal hold', () => (matter.legalHold ? releaseLegalHold : applyLegalHold)(matter.id, { expectedVersion: matter.version, reason: holdReason }))}>{matter.legalHold ? 'Release legal hold' : 'Apply legal hold'}</button>
                  </div>
                )}
              </section>

              {canWriteDocuments && <div className="grid gap-5 2xl:grid-cols-2">
                <form className="card space-y-3" onSubmit={upload}>
                  <div><h2 className="font-semibold">Upload governed evidence</h2><p className="text-sm text-slate-500">PDF, text, JPEG, or PNG; maximum 10 MB.</p></div>
                  <input className="input" value={uploadForm.title} onChange={(event) => setUploadForm({ ...uploadForm, title: event.target.value })} placeholder="Document title" minLength={3} required />
                  <select className="select" value={uploadForm.documentType} onChange={(event) => setUploadForm({ ...uploadForm, documentType: event.target.value })}>{documentTypes.map((type) => <option key={type}>{type}</option>)}</select>
                  <input className="block w-full text-sm" type="file" accept="application/pdf,text/plain,image/jpeg,image/png" onChange={(event) => setUploadForm({ ...uploadForm, file: event.target.files?.[0] || null })} required />
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={uploadForm.privileged} onChange={(event) => setUploadForm({ ...uploadForm, privileged: event.target.checked })} /> Privileged</label>
                  <button className="btn-primary" disabled={Boolean(busy)}>Upload and preserve provenance</button>
                </form>

                <form className="card space-y-3" onSubmit={(event) => {
                  event.preventDefault();
                  run('Generating document', () => generateDocument(matter.id, { templateId: generationForm.templateId, title: generationForm.title, variables: { customerName: generationForm.customerName }, privileged: generationForm.privileged, idempotencyKey: operationKey('generation') }));
                }}>
                  <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">Generate from authoritative template</h2><p className="text-sm text-slate-500">Generated output always requires separate review.</p></div>{canManage && <button type="button" className="btn-secondary text-sm" disabled={Boolean(busy)} onClick={() => run('Syncing templates', () => syncTemplates(matter.id, { documentTypes: documentTypes.filter((type) => type !== 'EVIDENCE'), idempotencyKey: operationKey('templates') }))}>Sync</button>}</div>
                  <select className="select" value={generationForm.templateId} onChange={(event) => setGenerationForm({ ...generationForm, templateId: event.target.value })} required><option value="">Select template</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.documentType} · {template.version}</option>)}</select>
                  {selectedTemplate && <p className="text-xs text-slate-500">{selectedTemplate.jurisdiction} · effective {new Date(selectedTemplate.effectiveFrom).toLocaleDateString()} · {selectedTemplate.sourceSystem}</p>}
                  <input className="input" value={generationForm.title} onChange={(event) => setGenerationForm({ ...generationForm, title: event.target.value })} placeholder="Document title" minLength={3} required />
                  <input className="input" value={generationForm.customerName} onChange={(event) => setGenerationForm({ ...generationForm, customerName: event.target.value })} placeholder="Customer name" required />
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={generationForm.privileged} onChange={(event) => setGenerationForm({ ...generationForm, privileged: event.target.checked })} /> Privileged</label>
                  <button className="btn-primary" disabled={Boolean(busy || !templates.length)}>Generate for review</button>
                </form>
              </div>}

              {canManage && matter.accessGrants && (
                <section className="card">
                  <h2 className="font-semibold">Matter access</h2>
                  <form className="mt-3 grid gap-2 lg:grid-cols-[1fr_180px_auto_auto]" onSubmit={(event) => {
                    event.preventDefault();
                    run('Granting matter access', () => grantMatterAccess(matter.id, { ...accessForm, expectedVersion: matter.version }));
                  }}>
                    <select className="select" value={accessForm.userId} onChange={(event) => setAccessForm({ ...accessForm, userId: event.target.value })} required><option value="">Select active user</option>{directory.filter((entry) => entry.id !== matter.ownerId).map((entry) => <option key={entry.id} value={entry.id}>{entry.lastName}, {entry.firstName} · {entry.email}</option>)}</select>
                    <select className="select" value={accessForm.role} onChange={(event) => setAccessForm({ ...accessForm, role: event.target.value })}><option>LEGAL_REVIEWER</option><option>CONTRIBUTOR</option><option>VIEWER</option></select>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={accessForm.canViewPrivileged} onChange={(event) => setAccessForm({ ...accessForm, canViewPrivileged: event.target.checked })} /> Privileged</label>
                    <button className="btn-primary" disabled={Boolean(busy)}>Grant</button>
                  </form>
                  <div className="mt-4 divide-y divide-slate-100">
                    {matter.accessGrants.filter((grant) => !grant.revokedAt).map((grant) => <div key={grant.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div><p className="font-medium">{grant.user.firstName} {grant.user.lastName}</p><p className="text-slate-500">{grant.user.email} · {grant.role} · {grant.canViewPrivileged ? 'privileged' : 'standard'}</p></div>{grant.userId !== matter.ownerId && <button className="text-rose-700" disabled={Boolean(busy)} onClick={() => run('Revoking matter access', () => revokeMatterAccess(matter.id, grant.userId, { expectedVersion: matter.version, reason: 'Matter assignment ended and access was revoked.' }))}>Revoke</button>}</div>)}
                  </div>
                </section>
              )}

              <section className="space-y-4">
                <div><h2 className="text-xl font-semibold">Documents</h2><p className="text-sm text-slate-600">Provider failures remain visible and retryable; signed and filed versions cannot be overwritten.</p></div>
                {matter.documents.map((document) => <DocumentCard key={document.id} document={document} accessRole={matter.currentAccess.role} busy={Boolean(busy)} run={run} />)}
                {!matter.documents.length && <div className="card text-sm text-slate-500">No visible documents in this matter.</div>}
              </section>

              <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                This console supports document operations; it does not provide legal advice. A designated human reviewer remains responsible for jurisdiction, effective-date, and substantive legal validation.
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
