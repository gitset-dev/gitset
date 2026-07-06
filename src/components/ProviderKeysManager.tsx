import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { KeyRound, Trash2, Star, Loader2, Plus, ShieldCheck, X } from 'lucide-react';

interface ProviderInfo {
  label: string;
  defaultModel: string;
  keyHint: string;
  needsBaseUrl: boolean;
  baseURL: string | null;
  models: string[];
}
interface StoredKey {
  id: number;
  provider: string;
  label: string | null;
  keyLast4: string;
  baseUrl: string | null;
  defaultModel: string | null;
  isDefault: boolean;
  createdAt: string;
}

const API = '/api/provider-keys';
const CUSTOM = '__custom__';

async function callApi<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data as T;
}

export default function ProviderKeysManager({ triggerLabel = 'Manage AI providers', triggerClassName, iconOnly = false }: { triggerLabel?: string; triggerClassName?: string; iconOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const [providers, setProviders] = useState<Record<string, ProviderInfo>>({});
  const [keys, setKeys] = useState<StoredKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const [provider, setProvider] = useState('anthropic');
  const [label, setLabel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [modelChoice, setModelChoice] = useState('');
  const [customModel, setCustomModel] = useState('');

  const current = providers[provider];
  const effectiveModel = modelChoice === CUSTOM ? customModel.trim() : modelChoice;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [p, k] = await Promise.all([
        callApi<{ providers: Record<string, ProviderInfo> }>('providers'),
        callApi<{ keys: StoredKey[] }>('list'),
      ]);
      setProviders(p.providers);
      setKeys(k.keys);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (open) refresh(); }, [open, refresh]);
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open]);

  useEffect(() => { setModelChoice(''); setCustomModel(''); }, [provider]);

  useEffect(() => {
    if (confirmDeleteId == null) return;
    const t = setTimeout(() => setConfirmDeleteId(null), 4000);
    return () => clearTimeout(t);
  }, [confirmDeleteId]);
  useEffect(() => { if (!open) setConfirmDeleteId(null); }, [open]);

  async function addKey(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setNotice(null);
    if (!apiKey.trim()) { setError('Enter your provider API key.'); return; }
    if (current?.needsBaseUrl && !baseUrl.trim()) { setError('A base URL is required for a custom provider.'); return; }
    if (modelChoice === CUSTOM && !customModel.trim()) { setError('Enter the custom model id, or pick a model from the list.'); return; }
    setBusy(true);
    try {
      await callApi('add', {
        provider,
        label: label.trim() || null,
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim() || undefined,
        defaultModel: effectiveModel || undefined,
      });
      setApiKey(''); setLabel(''); setBaseUrl(''); setModelChoice(''); setCustomModel('');
      setNotice('Key saved and encrypted. It never leaves the server in plaintext.');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save key');
    } finally { setBusy(false); }
  }

  async function remove(id: number) {
    setBusy(true); setError(null); setNotice(null); setConfirmDeleteId(null);
    try { await callApi('delete', { id }); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to delete'); }
    finally { setBusy(false); }
  }
  async function makeDefault(id: number) {
    setBusy(true); setError(null); setNotice(null);
    try { await callApi('set_default', { id }); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to update'); }
    finally { setBusy(false); }
  }
  async function changeModel(id: number, defaultModel: string | null) {
    setBusy(true); setError(null); setNotice(null);
    try { await callApi('update', { id, defaultModel }); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to update model'); }
    finally { setBusy(false); }
  }

  const inputCls = 'w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={triggerLabel}
        title={iconOnly ? triggerLabel : undefined}
        className={triggerClassName ?? "inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"}
      >
        <KeyRound className="h-4 w-4" /> {!iconOnly && triggerLabel}
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="byoai-modal-title"
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <h2 id="byoai-modal-title" className="font-semibold flex items-center gap-2"><KeyRound className="h-4 w-4 text-[#6CE0DB]" /> AI providers (BYOAI)</h2>
              <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-md p-1.5 hover:bg-zinc-800"><X className="h-4 w-4" /></button>
            </div>

            <div className="space-y-5 p-5">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 flex gap-3 items-start">
                <ShieldCheck className="h-5 w-5 text-[#6CE0DB] shrink-0 mt-0.5" />
                <p className="text-sm text-zinc-300">
                  Your keys are encrypted at rest (AES-256-GCM), are <strong>never</strong> sent to the
                  browser, logged, or shared, and are used only to run your own AI requests.
                </p>
              </div>

              {error && <div role="alert" className="rounded-md border border-red-900 bg-red-950/50 px-4 py-2 text-sm text-red-300">{error}</div>}
              {notice && <div role="status" className="rounded-md border border-[#6CE0DB]/30 bg-[#6CE0DB]/10 px-4 py-2 text-sm text-[#6CE0DB]">{notice}</div>}

              <form onSubmit={addKey} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
                <h3 className="font-medium flex items-center gap-2 text-sm"><Plus className="h-4 w-4" /> Add a provider key</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm space-y-1">
                    <span className="text-zinc-400">Provider</span>
                    <select value={provider} onChange={(e) => setProvider(e.target.value)} className={inputCls}>
                      {Object.entries(providers).map(([id, info]) => <option key={id} value={id}>{info.label}</option>)}
                    </select>
                  </label>
                  <label className="text-sm space-y-1">
                    <span className="text-zinc-400">Label (optional)</span>
                    <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. work, personal" className={inputCls} />
                  </label>
                </div>

                <label className="text-sm space-y-1 block">
                  <span className="text-zinc-400">API key{current ? ` (${current.keyHint})` : ''}</span>
                  <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} autoComplete="off" placeholder="Paste your provider API key" className={`${inputCls} font-mono`} />
                </label>

                {current?.needsBaseUrl && (
                  <label className="text-sm space-y-1 block">
                    <span className="text-zinc-400">Base URL (OpenAI-compatible endpoint)</span>
                    <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://your-endpoint/v1" className={inputCls} />
                  </label>
                )}

                <label className="text-sm space-y-1 block">
                  <span className="text-zinc-400">Model{current?.defaultModel ? ` (default: ${current.defaultModel})` : ''}</span>
                  <select value={modelChoice} onChange={(e) => setModelChoice(e.target.value)} className={inputCls}>
                    <option value="">Provider default{current?.defaultModel ? ` (${current.defaultModel})` : ''}</option>
                    {(current?.models || []).map((m) => <option key={m} value={m}>{m}</option>)}
                    <option value={CUSTOM}>Custom…</option>
                  </select>
                </label>
                {modelChoice === CUSTOM && (
                  <input value={customModel} onChange={(e) => setCustomModel(e.target.value)} placeholder="exact model id, e.g. claude-sonnet-4-6" className={`${inputCls} font-mono`} />
                )}

                <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Save key
                </button>
              </form>

              <div className="space-y-2">
                <h3 className="font-medium text-sm">Your keys</h3>
                {loading ? (
                  <div className="flex items-center gap-2 text-sm text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
                ) : keys.length === 0 ? (
                  <p className="text-sm text-zinc-500">No provider keys yet. Add one above to start using Gitset’s AI tools.</p>
                ) : (
                  <ul className="divide-y divide-zinc-800 rounded-lg border border-zinc-800">
                    {keys.map((k) => {
                      const models = providers[k.provider]?.models || [];

                      const modelOptions = k.defaultModel && !models.includes(k.defaultModel)
                        ? [k.defaultModel, ...models] : models;
                      return (
                        <li key={k.id} className="flex items-center justify-between gap-4 p-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{providers[k.provider]?.label || k.provider}</span>
                              {k.label && <span className="text-xs text-zinc-500">· {k.label}</span>}
                              {k.isDefault && <span className="inline-flex items-center gap-1 rounded-full bg-[#6CE0DB]/10 px-2 py-0.5 text-xs text-[#6CE0DB]"><Star className="h-3 w-3" /> default</span>}
                            </div>
                            <div className="text-xs text-zinc-500 font-mono">••••{k.keyLast4}{k.baseUrl ? ` · ${k.baseUrl}` : ''}</div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              value={k.defaultModel || ''}
                              onChange={(e) => changeModel(k.id, e.target.value || null)}
                              disabled={busy}
                              aria-label={`Model for ${providers[k.provider]?.label || k.provider} key`}
                              className="max-w-[180px] rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs disabled:opacity-50"
                            >
                              <option value="">Provider default</option>
                              {modelOptions.map((m) => <option key={m} value={m}>{m}</option>)}
                            </select>
                            {!k.isDefault && <button onClick={() => makeDefault(k.id)} disabled={busy} className="rounded-md border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-800 disabled:opacity-50">Set default</button>}
                            {confirmDeleteId === k.id ? (
                              <button onClick={() => remove(k.id)} disabled={busy} className="rounded-md bg-red-900/80 px-2 py-1 text-xs font-medium text-red-100 hover:bg-red-800 disabled:opacity-50">
                                Confirm delete
                              </button>
                            ) : (
                              <button onClick={() => setConfirmDeleteId(k.id)} disabled={busy} aria-label="Delete key" className="rounded-md border border-red-900 p-1.5 text-red-400 hover:bg-red-950 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
