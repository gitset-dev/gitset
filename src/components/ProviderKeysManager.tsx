import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { KeyRound, Trash2, Star, Loader2, Plus, ShieldCheck, X, HelpCircle, Sparkles, ExternalLink, Check, ChevronDown } from 'lucide-react';

interface FreeModelInfo {
  id: string;
  label: string;
  contextTokens: number;
  maxOutputTokens: number;
  goodFor: string;
  recommended?: boolean;
}
interface ProviderInfo {
  label: string;
  defaultModel: string;
  keyHint: string;
  needsBaseUrl: boolean;
  baseURL: string | null;
  models: string[];
  freeModels: FreeModelInfo[] | null;
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

function CustomModelField({ show, value, onChange, showHelp, setShowHelp }: {
  show: boolean; value: string; onChange: (v: string) => void; showHelp: boolean; setShowHelp: (v: boolean) => void;
}) {
  if (!show) return null;
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="exact model id, e.g. claude-sonnet-5"
          className="flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-mono"
        />
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          aria-label="What goes in this field?"
          aria-expanded={showHelp}
          className={`shrink-0 rounded-md border p-2 ${showHelp ? 'border-[#6CE0DB] text-[#6CE0DB]' : 'border-zinc-700 text-zinc-400 hover:text-zinc-200'}`}
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>
      {showHelp && (
        <p className="rounded-md border border-zinc-800 bg-zinc-950/60 p-2.5 text-xs text-zinc-400">
          Paste the model id exactly as your provider documents it — same spelling, same
          capitalization, same punctuation. There's no autocorrect here: a small typo won't be
          fixed, it will just fail with an error from the provider when you try to use it.
        </p>
      )}
    </div>
  );
}

interface StyledSelectOption {
  value: string;
  label: React.ReactNode;
}

// A native <select>'s open-dropdown styling (the highlighted/hovered row in
// particular) is OS-drawn and can't be themed with CSS — it shows the
// browser's own accent color regardless of the app's palette. This is a
// fully custom replacement so the dropdown itself carries the app's teal,
// not the OS's blue or gold.
function StyledSelect({ value, onChange, options, placeholder, disabled, compact, ariaLabel }: {
  value: string; onChange: (v: string) => void; options: StyledSelectOption[]; placeholder?: string;
  disabled?: boolean; compact?: boolean; ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickAway = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClickAway);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickAway);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={rootRef} className={`relative ${compact ? 'max-w-[180px]' : 'w-full'}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={`w-full flex items-center justify-between gap-2 rounded-md border bg-zinc-950 text-left transition-colors disabled:opacity-50 ${compact ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'} ${open ? 'border-[#6CE0DB]' : 'border-zinc-700 hover:border-zinc-600'}`}
      >
        <span className="truncate">{current?.label ?? <span className="text-zinc-500">{placeholder}</span>}</span>
        <ChevronDown className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} shrink-0 text-zinc-500 transition-transform ${open ? 'rotate-180 text-[#6CE0DB]' : ''}`} />
      </button>
      {open && (
        <div role="listbox" className={`absolute z-20 mt-1 max-h-64 overflow-y-auto rounded-md border border-zinc-700 bg-zinc-900 py-1 shadow-2xl ${compact ? 'w-max max-w-xs' : 'w-full'}`}>
          {options.map((o) => {
            const selected = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`flex w-full items-center justify-between gap-2 text-left ${compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm'} ${selected ? 'bg-[#6CE0DB]/15 text-[#6CE0DB]' : 'text-zinc-200 hover:bg-zinc-800'}`}
              >
                <span className="truncate">{o.label}</span>
                {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

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

export default function ProviderKeysManager({ triggerLabel = 'Manage AI providers', triggerClassName, iconOnly = false, autoOpen = false }: { triggerLabel?: string; triggerClassName?: string; iconOnly?: boolean; autoOpen?: boolean }) {
  // Opened for the visitor when they arrived here to do exactly this (a
  // "Set one up" CTA elsewhere on the site). Only the page that owns the
  // intent passes this — the header mounts this component too, and every
  // instance reading the URL itself would stack modals.
  const [open, setOpen] = useState(autoOpen);
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
  const [showCustomHelp, setShowCustomHelp] = useState(false);
  const [showFreeKeyHelp, setShowFreeKeyHelp] = useState(false);
  const [showMoreModels, setShowMoreModels] = useState(false);

  const current = providers[provider];
  const effectiveModel = modelChoice === CUSTOM ? customModel.trim() : modelChoice;
  const recommendedFree = current?.freeModels?.find((m) => m.recommended) || current?.freeModels?.[0];

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

  useEffect(() => {
    setCustomModel('');
    setShowMoreModels(false);
    // OpenRouter defaults straight to the recommended free model — the
    // whole point of this path is that a non-technical user shouldn't have
    // to know a model id to end up somewhere reasonable. Every other
    // provider keeps the old behavior: blank = "provider default".
    setModelChoice(provider === 'openrouter' && recommendedFree ? recommendedFree.id : '');
  }, [provider, providers]);

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
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-900 text-zinc-100 shadow-2xl"
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
                    <StyledSelect
                      value={provider}
                      onChange={setProvider}
                      options={Object.entries(providers).map(([id, info]) => ({
                        value: id,
                        label: id === 'openrouter' ? (
                          <span className="flex items-center gap-1.5">
                            {info.label}
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#6CE0DB]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#6CE0DB]">
                              <Sparkles className="h-2.5 w-2.5" /> Free models available
                            </span>
                          </span>
                        ) : info.label,
                      }))}
                    />
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

                {provider === 'openrouter' && current?.freeModels ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-[#6CE0DB]/30 bg-[#6CE0DB]/5 p-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-[#6CE0DB]">
                        <Sparkles className="h-4 w-4" /> Free models — no card, no payment
                      </div>
                      <p className="text-xs text-zinc-400">
                        OpenRouter offers real free models. Pick one below — nothing here ever costs money.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowFreeKeyHelp((v) => !v)}
                        className="text-xs font-medium text-[#6CE0DB] hover:underline inline-flex items-center gap-1"
                      >
                        Don't have a key? Create a free one → <ChevronDown className={`h-3 w-3 transition-transform ${showFreeKeyHelp ? 'rotate-180' : ''}`} />
                      </button>
                      {showFreeKeyHelp && (
                        <ol className="mt-1 space-y-2 rounded-md border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-300 list-decimal list-inside">
                          <li>
                            Sign in at{' '}
                            <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="text-[#6CE0DB] hover:underline inline-flex items-center gap-0.5">
                              openrouter.ai<ExternalLink className="h-2.5 w-2.5" />
                            </a>{' '}— continuing with Google is the fastest way if you don't have an account.
                          </li>
                          <li>
                            Open your API keys page:{' '}
                            <a href="https://openrouter.ai/workspaces/default/keys" target="_blank" rel="noopener noreferrer" className="text-[#6CE0DB] hover:underline inline-flex items-center gap-0.5">
                              openrouter.ai/workspaces/default/keys<ExternalLink className="h-2.5 w-2.5" />
                            </a>{' '}(that's where a new account lands by default).
                          </li>
                          <li>Click <strong className="text-zinc-100">Create Key</strong>, name it anything, and copy it into the field above.</li>
                          <li className="text-[#6CE0DB]">No payment method or card is required for this.</li>
                          <li>Free models have daily limits that vary by model. If one is busy, just pick a different one from the list below — nothing breaks.</li>
                        </ol>
                      )}
                    </div>

                    <div className="space-y-1.5" role="radiogroup" aria-label="Free OpenRouter model">
                      {current.freeModels.map((m) => {
                        const selected = modelChoice === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => setModelChoice(m.id)}
                            className={`w-full text-left rounded-md border p-2.5 transition-colors ${selected ? 'border-[#6CE0DB] bg-[#6CE0DB]/10' : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700'}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-[#6CE0DB] bg-[#6CE0DB] text-zinc-900' : 'border-zinc-600'}`}>
                                  {selected && <Check className="h-3 w-3" />}
                                </span>
                                <span className="text-sm font-medium truncate">{m.label}</span>
                                {m.recommended && <span className="shrink-0 rounded-full bg-[#6CE0DB]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#6CE0DB]">Recommended</span>}
                              </div>
                              <span className="shrink-0 text-[10px] text-zinc-500 font-mono">{m.id}</span>
                            </div>
                            <p className="mt-1 text-xs text-zinc-400">{m.goodFor}</p>
                          </button>
                        );
                      })}
                    </div>

                    <button type="button" onClick={() => setShowMoreModels((v) => !v)} className="text-xs text-zinc-500 hover:text-zinc-300 inline-flex items-center gap-1">
                      Or route a different model through OpenRouter <ChevronDown className={`h-3 w-3 transition-transform ${showMoreModels ? 'rotate-180' : ''}`} />
                    </button>
                    {showMoreModels && (
                      <div className="space-y-2 rounded-md border border-zinc-800 p-3">
                        <StyledSelect
                          value={modelChoice === CUSTOM || (current.models || []).includes(modelChoice) ? modelChoice : ''}
                          onChange={setModelChoice}
                          options={[
                            { value: '', label: `Provider default (${current?.defaultModel})` },
                            ...(current?.models || []).map((m) => ({ value: m, label: m })),
                            { value: CUSTOM, label: 'Custom…' },
                          ]}
                        />
                        <CustomModelField show={modelChoice === CUSTOM} value={customModel} onChange={setCustomModel} showHelp={showCustomHelp} setShowHelp={setShowCustomHelp} />
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <label className="text-sm space-y-1 block">
                      <span className="text-zinc-400">Model{current?.defaultModel ? ` (default: ${current.defaultModel})` : ''}</span>
                      <StyledSelect
                        value={modelChoice}
                        onChange={setModelChoice}
                        options={[
                          { value: '', label: `Provider default${current?.defaultModel ? ` (${current.defaultModel})` : ''}` },
                          ...(current?.models || []).map((m) => ({ value: m, label: m })),
                          { value: CUSTOM, label: 'Custom…' },
                        ]}
                      />
                    </label>
                    <CustomModelField show={modelChoice === CUSTOM} value={customModel} onChange={setCustomModel} showHelp={showCustomHelp} setShowHelp={setShowCustomHelp} />
                  </>
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
                            <StyledSelect
                              compact
                              value={k.defaultModel || ''}
                              onChange={(v) => changeModel(k.id, v || null)}
                              disabled={busy}
                              ariaLabel={`Model for ${providers[k.provider]?.label || k.provider} key`}
                              options={[
                                { value: '', label: 'Provider default' },
                                ...modelOptions.map((m) => ({ value: m, label: m })),
                              ]}
                            />
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
