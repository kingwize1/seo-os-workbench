import React, { useEffect, useState } from 'react';
import { FolderKanban, History, Plus, Save, Search } from 'lucide-react';
import { DeskShell } from '@/components/DeskShell';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';

export function SpacesPage() {
  const { desk, refreshDesk, showToast } = useApp();
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('');
  const [selectedPageId, setSelectedPageId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [showRevisions, setShowRevisions] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!desk) return;
    if (!selectedSpaceId && desk.spaces[0]) {
      setSelectedSpaceId(desk.spaces[0].id);
    }
    if (!selectedPageId && desk.pages[0]) {
      setSelectedPageId(desk.pages[0].id);
      setTitle(desk.pages[0].title);
      setContent(desk.pages[0].content);
    }
  }, [desk, selectedSpaceId, selectedPageId]);

  const activePage = desk?.pages.find((p) => p.id === selectedPageId) ?? null;
  const filteredPages =
    desk?.pages.filter(
      (p) =>
        (!selectedSpaceId || p.spaceId === selectedSpaceId) &&
        (!search.trim() ||
          p.title.toLowerCase().includes(search.toLowerCase()) ||
          p.content.toLowerCase().includes(search.toLowerCase()))
    ) ?? [];

  const handleSelectPage = (pageId: string) => {
    const pg = desk?.pages.find((p) => p.id === pageId);
    if (!pg) return;
    setSelectedPageId(pg.id);
    setTitle(pg.title);
    setContent(pg.content);
  };

  const handleSave = async () => {
    if (!selectedSpaceId || !title.trim()) return;
    setSaving(true);
    try {
      const res = (await api.savePage({
        pageId: activePage?.id,
        spaceId: selectedSpaceId,
        title: title.trim(),
        content,
      })) as { page: { id: string } };
      await refreshDesk();
      setSelectedPageId(res.page.id);
      showToast('Page saved with new revision logged.');
    } finally {
      setSaving(false);
    }
  };

  const handleNewPage = async (parentPageId: string | null = null) => {
    if (!selectedSpaceId) return;
    const res = (await api.savePage({
      spaceId: selectedSpaceId,
      parentPageId,
      title: parentPageId ? 'Nested Sub-Brief (Untitled)' : 'New Working Document',
      content: '# New Working Document\n\nDrafted inside SEO OS Business Spaces.',
    })) as { page: { id: string; title: string; content: string } };
    await refreshDesk();
    setSelectedPageId(res.page.id);
    setTitle(res.page.title);
    setContent(res.page.content);
    showToast('Created new page in Business Space.');
  };

  return (
    <DeskShell>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left: Spaces & Nested Pages Tree */}
        <aside className="os-panel space-y-4 rounded-2xl p-4 lg:col-span-4">
          <div className="flex items-center justify-between">
            <h1 className="flex items-center gap-2 font-display text-lg font-bold text-white">
              <FolderKanban className="h-5 w-5 text-cyan-400" />
              Business Spaces
            </h1>
            <button
              type="button"
              onClick={() => handleNewPage(null)}
              className="inline-flex items-center gap-1 rounded-lg bg-cyan-400 px-2.5 py-1 text-xs font-bold text-slate-950 hover:bg-cyan-300"
            >
              <Plus className="h-3.5 w-3.5" /> Page
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search briefs, plans & pages..."
              className="w-full rounded-lg border border-white/10 bg-slate-950 py-2 pl-8 pr-3 text-xs text-white"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {desk?.spaces.map((sp) => (
              <button
                key={sp.id}
                type="button"
                onClick={() => setSelectedSpaceId(sp.id)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                  selectedSpaceId === sp.id
                    ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-100'
                    : 'border-white/10 bg-white/5 text-slate-300'
                }`}
              >
                {sp.icon} {sp.name}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            {filteredPages.map((pg) => (
              <button
                key={pg.id}
                type="button"
                onClick={() => handleSelectPage(pg.id)}
                className={`block w-full rounded-xl border p-3 text-left transition ${
                  selectedPageId === pg.id
                    ? 'border-cyan-400/50 bg-cyan-500/15'
                    : 'border-white/10 bg-slate-950/60 hover:bg-white/5'
                } ${pg.parentPageId ? 'ml-4 w-[calc(100%-1rem)]' : ''}`}
              >
                <div className="text-xs font-semibold text-white">
                  {pg.parentPageId ? '↳ ' : ''}
                  {pg.title}
                </div>
                <div className="mt-0.5 font-mono-tech text-[10px] text-slate-400">
                  v{pg.version} · {pg.updatedBy}
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Right: Page Editor & Revision History */}
        <section className="os-glass space-y-4 rounded-2xl p-5 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label="Page title"
              className="flex-1 bg-transparent font-display text-xl font-bold text-white focus:outline-none"
            />
            <div className="flex items-center gap-2">
              {activePage && (
                <>
                  <button
                    type="button"
                    onClick={() => handleNewPage(activePage.id)}
                    className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/10"
                  >
                    + Nested Sub-Page
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRevisions(!showRevisions)}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/10"
                  >
                    <History className="h-3.5 w-3.5" />
                    Revisions ({activePage.revisions.length})
                  </button>
                </>
              )}
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-400 px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                Save Revision
              </button>
            </div>
          </div>

          <textarea
            rows={16}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            aria-label="Markdown document editor"
            className="w-full rounded-xl border border-white/10 bg-slate-950/90 p-4 font-mono-tech text-xs leading-relaxed text-slate-100 focus:border-cyan-400 focus:outline-none"
          />

          {showRevisions && activePage && (
            <div className="rounded-xl border border-white/10 bg-slate-950/80 p-4 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Page Revision History
              </div>
              {activePage.revisions
                .slice()
                .reverse()
                .map((rev) => (
                  <div key={rev.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/70 p-2.5 text-xs">
                    <div>
                      <span className="font-mono-tech font-bold text-cyan-300">v{rev.version}</span>{' '}
                      <span className="text-slate-300">by {rev.authorName}</span>
                      <span className="ml-2 text-slate-500">{new Date(rev.createdAt).toLocaleString()}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setContent(rev.content);
                        showToast(`Loaded revision v${rev.version} into editor.`);
                      }}
                      className="text-xs text-cyan-400 hover:underline"
                    >
                      Restore to Editor
                    </button>
                  </div>
                ))}
            </div>
          )}
        </section>
      </div>
    </DeskShell>
  );
}
