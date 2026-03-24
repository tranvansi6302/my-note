import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Plus,
  Search,
  Trash2,
  StickyNote,
  FileText,
  PanelLeftClose,
  Star,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Type,
  Link as LinkIcon,
  History,
  Menu,
  X
} from 'lucide-react';

// Types
interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
  isFavorite?: boolean;
}

const STORAGE_KEY = 'antigravity_notes_v1';

function App() {
  // State
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [activeStyles, setActiveStyles] = useState<{ [key: string]: boolean }>({});

  const editorRef = useRef<HTMLDivElement>(null);
  const syncTimer = useRef<NodeJS.Timeout | null>(null);

  // Resize listener
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024 && isSidebarOpen) {
        setIsSidebarOpen(false);
      } else if (window.innerWidth >= 1024 && !isSidebarOpen) {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen]);

  // Memoized derived states
  const filteredNotes = useMemo(() => {
    return notes
      .filter(n =>
        (n.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (n.content?.toLowerCase() || '').includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes, searchQuery]);

  const activeNote = useMemo(() =>
    notes.find(n => n.id === activeNoteId) || null
    , [notes, activeNoteId]);

  // Effects
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  const checkStyles = useCallback(() => {
    const styles = {
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      insertUnorderedList: document.queryCommandState('insertUnorderedList'),
      insertOrderedList: document.queryCommandState('insertOrderedList'),
    };
    setActiveStyles(styles);
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', checkStyles);
    return () => document.removeEventListener('selectionchange', checkStyles);
  }, [checkStyles]);

  useEffect(() => {
    if (editorRef.current && activeNote) {
      if (editorRef.current.innerHTML !== activeNote.content) {
        editorRef.current.innerHTML = activeNote.content;
      }
    } else if (editorRef.current && !activeNote) {
      editorRef.current.innerHTML = '';
    }
    if (syncTimer.current) clearTimeout(syncTimer.current);
  }, [activeNoteId]);

  // Actions
  const createNote = () => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: '',
      content: '<div></div>',
      updatedAt: Date.now(),
    };
    setNotes(prev => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const updateNoteImmediate = (id: string, updates: Partial<Note>) => {
    setNotes(prev => prev.map(n =>
      n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n
    ));
  };

  const syncToMainState = useCallback(() => {
    if (!activeNoteId || !editorRef.current) return;
    const currentHtml = editorRef.current.innerHTML;
    setNotes(prev => prev.map(n =>
      n.id === activeNoteId ? { ...n, content: currentHtml, updatedAt: Date.now() } : n
    ));
  }, [activeNoteId]);

  const debouncedSync = useCallback(() => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      syncToMainState();
    }, 800);
  }, [syncToMainState]);

  const deleteNote = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm('Delete this note forever?')) {
      if (syncTimer.current) clearTimeout(syncTimer.current);
      setNotes(prev => prev.filter(n => n.id !== id));
      if (activeNoteId === id) setActiveNoteId(null);
    }
  };

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNotes(prev => prev.map(n =>
      n.id === id ? { ...n, isFavorite: !n.isFavorite } : n
    ));
  };

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(timestamp));
  };

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    checkStyles();
    syncToMainState();
  };

  const handleInput = () => {
    debouncedSync();
    checkStyles();
  };

  const stripHtml = (html: string) => {
    if (!html) return "";
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  return (
    <div className="flex h-screen w-full bg-[#050505] text-[#e0e0e0] font-sans overflow-hidden select-none">
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${isSidebarOpen ? 'w-[280px] translate-x-0 shadow-2xl lg:shadow-none' : 'w-0 -translate-x-full lg:translate-x-0 lg:w-[280px]'
          } fixed lg:relative h-full transition-all duration-300 ease-in-out bg-[#0c0c0e] border-r border-[#1a1a1c] flex flex-col z-40 overflow-hidden shrink-0`}
      >
        <div className="px-5 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[4px] bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-lg">
              <StickyNote size={16} className="text-indigo-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold font-heading text-slate-200">Notebook</h1>
              <p className="text-[10px] text-slate-500">Your ideas, organized</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 text-slate-600 hover:text-white lg:hidden">
            <X size={18} />
          </button>
        </div>

        <div className="px-4 my-2">
          <button onClick={createNote} className="w-full h-9 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[4px] text-xs font-medium transition-all active:scale-[0.98] shadow-md shadow-indigo-600/10">
            <Plus size={14} />
            New note
          </button>
        </div>

        <div className="px-4 mb-2">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#161618] border border-white/5 rounded-[4px] py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:border-indigo-500/30 transition-all placeholder:text-slate-600"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2 scrollbar-thin">
          <div className="space-y-0.5">
            {filteredNotes.length === 0 ? (
              <div className="px-3 py-10 text-center opacity-30">
                <FileText size={32} className="mx-auto mb-2" />
                <p className="text-[11px]">Empty list</p>
              </div>
            ) : (
              filteredNotes.map(n => (
                <div
                  key={n.id}
                  onClick={() => {
                    setActiveNoteId(n.id);
                    if (window.innerWidth < 1024) setIsSidebarOpen(false);
                  }}
                  className={`group relative px-3 py-2.5 rounded-[4px] cursor-pointer transition-all duration-200 ${activeNoteId === n.id ? 'bg-indigo-500/10' : 'hover:bg-white/[0.03]'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-[13px] font-medium truncate mb-0.5 ${activeNoteId === n.id ? 'text-indigo-300' : 'text-slate-300'}`}>{n.title || 'Untitled'}</h3>
                      <p className="text-[11px] text-slate-600 truncate opacity-80">{stripHtml(n.content) || 'No content...'}</p>
                    </div>
                    {n.isFavorite && <Star size={10} className="fill-amber-400 text-amber-400 flex-shrink-0 mt-1" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-4 border-t border-white/5 bg-[#08080a] flex items-center justify-between">
          <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 text-slate-600 hover:text-white hover:bg-white/5 rounded-[4px] transition-colors hidden lg:block">
            <PanelLeftClose size={18} />
          </button>
          <span className="text-[10px] text-slate-600 font-medium">{notes.length} notes</span>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-[#050505] relative min-w-0">
        <header className="h-14 px-4 md:px-8 flex items-center justify-between shrink-0 border-b border-white/5 lg:border-none">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-1.5 text-slate-400 hover:text-white bg-white/5 rounded-[4px] transition-all ${isSidebarOpen && 'lg:invisible'}`}
            >
              <Menu size={18} />
            </button>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium overflow-hidden">
              <span className="truncate">{activeNote ? `Updated ${formatDate(activeNote.updatedAt)}` : 'Notebook'}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {activeNote && (
              <>
                <button onClick={() => toggleFavorite(activeNote.id)} className={`p-2 rounded-[4px] transition-all ${activeNote.isFavorite ? 'text-amber-400' : 'text-slate-600 hover:text-white'}`}>
                  <Star size={18} className={activeNote.isFavorite ? 'fill-amber-400' : ''} />
                </button>
                <button onClick={() => deleteNote(activeNote.id)} className="p-2 text-slate-600 hover:text-rose-500 transition-all">
                  <Trash2 size={18} />
                </button>
              </>
            )}
          </div>
        </header>

        {!activeNote ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 opacity-20">
            <FileText size={48} className="text-slate-500 mb-4" />
            <h2 className="text-lg font-medium text-slate-400">Select a note</h2>
          </div>
        ) : (
          <div className="flex-1 relative flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 md:px-12 lg:px-20 pt-6 pb-40 scrollbar-thin">
              <div className="max-w-3xl mx-auto w-full">
                <input
                  type="text"
                  placeholder="Note title"
                  value={activeNote.title}
                  onChange={(e) => updateNoteImmediate(activeNote.id, { title: e.target.value })}
                  className="w-full bg-transparent border-none text-2xl md:text-4xl font-bold font-heading text-white focus:outline-none mb-6 placeholder:text-white/20"
                />
                <div
                  ref={editorRef}
                  contentEditable
                  placeholder="Write something..."
                  onInput={handleInput}
                  className="w-full min-h-[500px] bg-transparent border-none text-base md:text-[17px] leading-[1.7] text-slate-400 focus:outline-none prose prose-invert max-w-none pb-20"
                />
              </div>
            </div>

            {/* Toolbar - Vertical on Right on Mobile, Horizontal Bottom on Desktop */}
            <div className="absolute top-1/2 -translate-y-1/2 right-4 md:top-auto md:bottom-10 md:left-1/2 md:-translate-x-1/2 md:translate-y-0 z-30 pointer-events-none">
              <div className="pointer-events-auto bg-[#121214]/90 backdrop-blur-xl p-1.5 md:px-4 md:py-2 rounded-2xl md:rounded-full shadow-2xl flex flex-col md:flex-row items-center gap-1 border border-white/5">
                <ToolbarButton isActive={activeStyles.bold} onClick={() => execCommand('bold')} icon={<Bold className="w-3.5 h-3.5 md:w-4 md:h-4" />} label="Bold" />
                <ToolbarButton isActive={activeStyles.italic} onClick={() => execCommand('italic')} icon={<Italic className="w-3.5 h-3.5 md:w-4 md:h-4" />} label="Italic" />
                <ToolbarButton isActive={activeStyles.underline} onClick={() => execCommand('underline')} icon={<Underline className="w-3.5 h-3.5 md:w-4 md:h-4" />} label="Underline" />
                <div className="h-[1px] w-3.5 md:h-4 md:w-[1px] bg-white/10 my-1 md:mx-1.5 shrink-0" />
                <ToolbarButton isActive={activeStyles.insertUnorderedList} onClick={() => execCommand('insertUnorderedList')} icon={<List className="w-3.5 h-3.5 md:w-4 md:h-4" />} label="Bullet list" />
                <ToolbarButton isActive={activeStyles.insertOrderedList} onClick={() => execCommand('insertOrderedList')} icon={<ListOrdered className="w-3.5 h-3.5 md:w-4 md:h-4" />} label="Numbered list" />
                <div className="h-[1px] w-3.5 md:h-4 md:w-[1px] bg-white/10 my-1 md:mx-1.5 shrink-0" />
                <ToolbarButton onClick={() => {
                  const level = prompt('Heading level (1-3):', '1');
                  if (level) execCommand('formatBlock', `<h${level}>`);
                }} icon={<Type className="w-3.5 h-3.5 md:w-4 md:h-4" />} label="Heading" />
                <ToolbarButton onClick={() => {
                  const url = prompt('Enter link URL:');
                  if (url) execCommand('createLink', url);
                }} icon={<LinkIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />} label="Link" />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ToolbarButton({ onClick, icon, label, isActive }: { onClick: () => void, icon: React.ReactNode, label: string, isActive?: boolean }) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`p-2 rounded-full transition-all group relative active:scale-95 shrink-0 ${isActive
          ? 'bg-white/10 text-white shadow-inner'
          : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
        }`}
      title={label}
    >
      {icon}
      <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 md:right-auto md:left-1/2 md:-translate-x-1/2 md:bottom-full md:top-auto md:mb-3 px-2 py-1 bg-[#1a1a1c] text-white text-[10px] rounded-[4px] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity border border-white/5 whitespace-nowrap shadow-xl hidden lg:block">
        {label}
      </span>
    </button>
  );
}

export default App;
