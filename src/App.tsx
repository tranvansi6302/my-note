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
  Menu,
  X,
  Sun,
  Moon
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
const THEME_KEY = 'notebook_theme';

function App() {
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [activeStyles, setActiveStyles] = useState<{ [key: string]: boolean }>({});
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return (saved as 'dark' | 'light') || 'dark';
  });
  
  const editorRef = useRef<HTMLDivElement>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

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

  const filteredNotes = useMemo(() => {
    return notes
      .filter(n => (n.title + n.content).toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes, searchQuery]);

  const activeNote = useMemo(() => 
    notes.find(n => n.id === activeNoteId) || null
  , [notes, activeNoteId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

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

  const updateTitle = (id: string, title: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, title, updatedAt: Date.now() } : n));
  };

  const syncContent = useCallback(() => {
    if (!activeNoteId || !editorRef.current) return;
    const currentHtml = editorRef.current.innerHTML;
    setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, content: currentHtml, updatedAt: Date.now() } : n));
  }, [activeNoteId]);

  const debouncedSync = useCallback(() => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(syncContent, 800);
  }, [syncContent]);

  const deleteNote = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm('Delete this note?')) {
      if (syncTimer.current) clearTimeout(syncTimer.current);
      setNotes(prev => prev.filter(n => n.id !== id));
      if (activeNoteId === id) setActiveNoteId(null);
    }
  };

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNotes(prev => prev.map(n => n.id === id ? { ...n, isFavorite: !n.isFavorite } : n));
  };

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp));
  };

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    checkStyles();
    syncContent();
  };

  const handleInput = () => {
    debouncedSync();
    checkStyles();
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  return (
    <div className="flex h-screen w-full bg-[var(--bg-main)] text-[var(--text-main)] font-sans overflow-hidden select-none transition-colors duration-300">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`${isSidebarOpen ? 'w-[280px] translate-x-0 shadow-2xl lg:shadow-none' : 'w-0 -translate-x-full lg:translate-x-0 lg:w-[280px]'} fixed lg:relative h-full transition-all duration-300 ease-in-out bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] flex flex-col z-40 overflow-hidden shrink-0`}>
        <div className="px-5 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[4px] bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-lg group">
              <StickyNote size={16} className="text-indigo-400 animate-spin [animation-duration:8s]" />
            </div>
            <h1 className="text-sm font-semibold font-heading">Notebook</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 text-[var(--text-muted)] lg:hidden"><X size={18} /></button>
        </div>

        <div className="px-4 my-2">
          <button onClick={createNote} className="w-full h-9 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[4px] text-xs font-semibold transition-all shadow-md shadow-indigo-600/10">
            <Plus size={14} /> New note
          </button>
        </div>

        <div className="px-4 mb-2">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input 
              type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-[4px] py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:border-indigo-500/30 transition-all placeholder:text-[var(--text-muted)]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2 scrollbar-thin">
          {filteredNotes.length === 0 ? (
            <div className="px-3 py-10 text-center opacity-30 text-[var(--text-muted)]">
              <FileText size={32} className="mx-auto mb-2" />
              <p className="text-[11px]">No notes found</p>
            </div>
          ) : (
            filteredNotes.map(n => (
              <div 
                key={n.id} onClick={() => { setActiveNoteId(n.id); if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
                className={`group relative px-3 py-2.5 rounded-[4px] cursor-pointer transition-all ${activeNoteId === n.id ? 'bg-[var(--bg-active-note)]' : 'hover:bg-[var(--bg-sidebar-hover)]'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-[13px] font-medium truncate mb-0.5 ${activeNoteId === n.id ? 'text-indigo-400' : 'text-[var(--text-secondary)]'}`}>{n.title || 'Untitled'}</h3>
                    <p className="text-[11px] text-[var(--text-muted)] truncate opacity-80">{stripHtml(n.content) || 'No content...'}</p>
                  </div>
                  {n.isFavorite && <Star size={10} className="fill-amber-400 text-amber-400 flex-shrink-0 mt-1" />}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-sidebar)] flex items-center justify-between">
           <div className="flex items-center gap-1">
             <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-sidebar-hover)] rounded-[4px] hidden lg:block"><PanelLeftClose size={18} /></button>
             <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-sidebar-hover)] rounded-[4px]">
               {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
             </button>
           </div>
           <span className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-tighter opacity-60">{notes.length} notes</span>
        </div>
      </aside>

      <main className="flex-1 flex flex-col bg-[var(--bg-main)] relative min-w-0 transition-all duration-300">
        <header className="h-14 px-4 md:px-8 flex items-center justify-between shrink-0 border-b border-[var(--border-color)] lg:border-none">
           <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-1.5 text-[var(--text-muted)] bg-[var(--bg-sidebar-hover)] rounded-[4px] lg:hidden mb-0`}><Menu size={18} /></button>
              <div className="text-[11px] text-[var(--text-muted)] font-medium truncate">
                {activeNote ? `Updated ${formatDate(activeNote.updatedAt)}` : 'Notebook'}
              </div>
           </div>
          
          <div className="flex items-center gap-1">
            {activeNote && (
              <>
                <button onClick={() => toggleFavorite(activeNote.id)} className={`p-2 rounded-[4px] transition-all ${activeNote.isFavorite ? 'text-amber-400' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
                  <Star size={18} className={activeNote.isFavorite ? 'fill-amber-400' : ''} />
                </button>
                <button onClick={() => deleteNote(activeNote.id)} className="p-2 text-[var(--text-muted)] hover:text-rose-500 transition-all"><Trash2 size={18} /></button>
              </>
            )}
          </div>
        </header>

        {!activeNote ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 opacity-10">
            <FileText size={64} className="text-[var(--text-muted)] mb-4" />
            <h2 className="text-lg font-medium">Select a note to write</h2>
          </div>
        ) : (
          <div className="flex-1 relative flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 md:px-12 lg:px-20 pt-10 pb-40 scrollbar-thin">
              <div className="max-w-3xl mx-auto w-full">
                <input 
                  type="text" placeholder="Note title" value={activeNote.title} onChange={(e) => updateTitle(activeNote.id, e.target.value)}
                  className="w-full bg-transparent border-none text-2xl md:text-5xl font-bold font-heading text-[var(--text-main)] focus:outline-none mb-8 placeholder:text-[var(--text-muted)]/20"
                />
                <div 
                  ref={editorRef} contentEditable data-placeholder="Start writing your thoughts..." onInput={handleInput}
                  className="w-full min-h-[500px] bg-transparent border-none text-base md:text-lg leading-relaxed text-[var(--editor-text)] focus:outline-none prose max-w-none pb-20"
                />
              </div>
            </div>

            {/* Tight Toolbar Lock */}
            <div className="absolute z-30 transition-all duration-300 pointer-events-none top-1/2 -translate-y-1/2 right-4 md:top-auto md:bottom-10 md:left-1/2 md:-translate-x-1/2 md:translate-y-0 flex justify-center w-full md:w-auto">
              <div className="pointer-events-auto bg-[var(--toolbar-bg)] backdrop-blur-xl p-1.5 md:p-1.5 rounded-2xl md:rounded-full shadow-2xl flex flex-col md:flex-row items-center gap-0.5 md:gap-1 border border-[var(--border-color)]">
                <ToolbarButton isActive={activeStyles.bold} onClick={() => execCommand('bold')} icon={<Bold className="w-4 h-4" />} label="Bold" />
                <ToolbarButton isActive={activeStyles.italic} onClick={() => execCommand('italic')} icon={<Italic className="w-4 h-4" />} label="Italic" />
                <ToolbarButton isActive={activeStyles.underline} onClick={() => execCommand('underline')} icon={<Underline className="w-4 h-4" />} label="Underline" />
                <div className="h-[1px] w-4 md:h-5 md:w-[1px] bg-[var(--border-color)] my-1 md:mx-0.5 shrink-0" />
                <ToolbarButton isActive={activeStyles.insertUnorderedList} onClick={() => execCommand('insertUnorderedList')} icon={<List className="w-4 h-4" />} label="Bullet list" />
                <ToolbarButton isActive={activeStyles.insertOrderedList} onClick={() => execCommand('insertOrderedList')} icon={<ListOrdered className="w-4 h-4" />} label="Numbered list" />
                <div className="h-[1px] w-4 md:h-5 md:w-[1px] bg-[var(--border-color)] my-1 md:mx-0.5 shrink-0" />
                <ToolbarButton onClick={() => { const l = prompt('Level 1-3:', '1'); if(l) execCommand('formatBlock', `<h${l}>`); }} icon={<Type className="w-4 h-4" />} label="Heading" />
                <ToolbarButton onClick={() => { const u = prompt('URL:'); if(u) execCommand('createLink', u); }} icon={<LinkIcon className="w-4 h-4" />} label="Link" />
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
    <button onClick={(e) => { e.preventDefault(); onClick(); }}
      className={`p-2 rounded-full transition-all group relative active:scale-90 shrink-0 ${isActive ? 'bg-indigo-600/30 text-indigo-400 shadow-inner' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-sidebar-hover)]'}`}
    >
      {icon}
      <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 md:right-auto md:left-1/2 md:-translate-x-1/2 md:bottom-full md:top-auto md:mb-3 px-2 py-1 bg-[var(--text-main)] text-[var(--bg-main)] text-[10px] rounded-[4px] opacity-0 group-hover:opacity-100 pointer-events-none transition-all hidden lg:block whitespace-nowrap">{label}</span>
    </button>
  );
}

export default App;
