import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Plus, X, CheckSquare, Square, Star, Trash2, ShoppingBag, ClipboardList, StickyNote, Plane, Filter, Download, Upload, GripVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as XLSX from 'xlsx';

interface ChecklistItem {
  id: string;
  trip_id: string;
  user_id: string;
  text: string;
  is_completed: boolean;
  category: string;
  priority: string;
  sort_order: number;
  created_at: string;
}

const CATEGORIES = [
  { value: 'before_trip', label: 'לפני הטיול', emoji: '✈️', icon: Plane },
  { value: 'shopping', label: 'קניות', emoji: '🛍️', icon: ShoppingBag },
  { value: 'task', label: 'משימה', emoji: '📌', icon: ClipboardList },
  { value: 'note', label: 'הערה', emoji: '📝', icon: StickyNote },
];

const getCategoryConfig = (value: string) => CATEGORIES.find(c => c.value === value) || CATEGORIES[2];

// Sortable item component
interface SortableChecklistItemProps {
  item: ChecklistItem;
  onToggleComplete: (item: ChecklistItem) => void;
  onTogglePriority: (item: ChecklistItem) => void;
  onDelete: (id: string) => void;
}

const SortableChecklistItem: React.FC<SortableChecklistItemProps> = ({ item, onToggleComplete, onTogglePriority, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.8 : undefined,
  };
  const catConfig = getCategoryConfig(item.category);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group card-surface p-3 flex items-center gap-3 transition-all ${
        item.is_completed ? 'opacity-60' : ''
      } ${item.priority === 'high' && !item.is_completed ? 'border-accent/30 bg-accent/5' : ''}`}
    >
      <button {...attributes} {...listeners} className="flex-shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground touch-none">
        <GripVertical className="h-4 w-4" />
      </button>
      <button onClick={() => onToggleComplete(item)} className="flex-shrink-0 text-primary hover:scale-110 transition-transform">
        {item.is_completed ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5 text-muted-foreground" />}
      </button>
      <span className="text-xs px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">{catConfig.emoji}</span>
      <span className={`flex-1 text-sm ${item.is_completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{item.text}</span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onTogglePriority(item)} className={`p-1 rounded transition-colors ${item.priority === 'high' ? 'text-accent' : 'text-muted-foreground/40 hover:text-accent'}`} title="עדיפות">
          <Star className={`h-3.5 w-3.5 ${item.priority === 'high' ? 'fill-accent' : ''}`} />
        </button>
        <button onClick={() => onDelete(item.id)} className="p-1 text-muted-foreground/40 hover:text-destructive rounded transition-colors" title="מחק">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

interface TripChecklistProps {
  tripId: string;
}

const TripChecklist: React.FC<TripChecklistProps> = ({ tripId }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState('task');
  const [newPriority, setNewPriority] = useState('normal');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [hideCompleted, setHideCompleted] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (!user) return;
    const fetchItems = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('trip_id', tripId)
        .order('sort_order', { ascending: true });
      if (error) {
        console.error('Error fetching checklist:', error);
      } else {
        setItems((data as any[]) || []);
      }
      setLoading(false);
    };
    fetchItems();
  }, [tripId, user]);

  const filtered = useMemo(() => {
    return items.filter(item => {
      if (filterCategory && item.category !== filterCategory) return false;
      if (hideCompleted && item.is_completed) return false;
      return true;
    });
  }, [items, filterCategory, hideCompleted]);

  const sortedFiltered = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
      if (a.priority !== b.priority) return a.priority === 'high' ? -1 : 1;
      return a.sort_order - b.sort_order;
    });
  }, [filtered]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedFiltered.findIndex(i => i.id === active.id);
    const newIndex = sortedFiltered.findIndex(i => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(sortedFiltered, oldIndex, newIndex);
    // Update sort_order for all reordered items
    const updates = reordered.map((item, idx) => ({ ...item, sort_order: idx }));
    setItems(prev => {
      const reorderedIds = new Set(updates.map(u => u.id));
      const unchanged = prev.filter(i => !reorderedIds.has(i.id));
      return [...unchanged, ...updates].sort((a, b) => a.sort_order - b.sort_order);
    });

    // Persist to DB
    const promises = updates.map((item, idx) =>
      supabase.from('checklist_items').update({ sort_order: idx }).eq('id', item.id)
    );
    await Promise.all(promises);
  }, [sortedFiltered]);

  const completedCount = items.filter(i => i.is_completed).length;
  const totalCount = items.length;

  const addItem = async () => {
    if (!newText.trim() || !user) return;
    const newItem = {
      trip_id: tripId,
      user_id: user.id,
      text: newText.trim(),
      category: newCategory,
      priority: newPriority,
      sort_order: items.length,
    };
    const { data, error } = await supabase
      .from('checklist_items')
      .insert(newItem)
      .select()
      .single();
    if (error) {
      toast({ title: 'שגיאה בהוספת פריט', variant: 'destructive' });
    } else {
      setItems(prev => [...prev, data as any]);
      setNewText('');
      setNewPriority('normal');
    }
  };

  const toggleComplete = async (item: ChecklistItem) => {
    const updated = !item.is_completed;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_completed: updated } : i));
    const { error } = await supabase
      .from('checklist_items')
      .update({ is_completed: updated })
      .eq('id', item.id);
    if (error) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_completed: !updated } : i));
      toast({ title: 'שגיאה בעדכון', variant: 'destructive' });
    }
  };

  const deleteItem = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    const { error } = await supabase
      .from('checklist_items')
      .delete()
      .eq('id', id);
    if (error) {
      toast({ title: 'שגיאה במחיקה', variant: 'destructive' });
    }
  };

  const togglePriority = async (item: ChecklistItem) => {
    const newP = item.priority === 'high' ? 'normal' : 'high';
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, priority: newP } : i));
    const { error } = await supabase
      .from('checklist_items')
      .update({ priority: newP })
      .eq('id', item.id);
    if (error) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, priority: item.priority } : i));
    }
  };

  const exportCSV = () => {
    const header = 'טקסט,קטגוריה,עדיפות,הושלם';
    const rows = items.map(item => {
      const cat = getCategoryConfig(item.category);
      return `"${item.text.replace(/"/g, '""')}","${cat.label}","${item.priority === 'high' ? 'גבוהה' : 'רגילה'}","${item.is_completed ? 'כן' : 'לא'}"`;
    });
    const csv = '\uFEFF' + [header, ...rows].join('\n'); // BOM for Hebrew Excel support
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `checklist_${tripId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'הצ\'קליסט יוצא בהצלחה! 📥' });
  };

  const importCSV = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx,.xls';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !user) return;

      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      
      // Skip header row
      const dataLines = lines.slice(1);
      if (dataLines.length === 0) {
        toast({ title: 'הקובץ ריק', variant: 'destructive' });
        return;
      }

      const categoryMap: Record<string, string> = {
        'לפני הטיול': 'before_trip',
        'קניות': 'shopping',
        'משימה': 'task',
        'הערה': 'note',
        'before_trip': 'before_trip',
        'shopping': 'shopping',
        'task': 'task',
        'note': 'note',
      };

      const newItems: Array<{
        trip_id: string;
        user_id: string;
        text: string;
        category: string;
        priority: string;
        is_completed: boolean;
        sort_order: number;
      }> = [];

      dataLines.forEach((line, idx) => {
        // Parse CSV line respecting quotes
        const cols: string[] = [];
        let current = '';
        let inQuotes = false;
        for (const char of line) {
          if (char === '"') { inQuotes = !inQuotes; continue; }
          if (char === ',' && !inQuotes) { cols.push(current.trim()); current = ''; continue; }
          current += char;
        }
        cols.push(current.trim());

        const itemText = cols[0];
        if (!itemText) return;

        const catRaw = cols[1] || '';
        const category = categoryMap[catRaw] || 'task';
        const priority = (cols[2] || '').includes('גבוהה') || (cols[2] || '').toLowerCase() === 'high' ? 'high' : 'normal';
        const isCompleted = (cols[3] || '').includes('כן') || (cols[3] || '').toLowerCase() === 'yes';

        newItems.push({
          trip_id: tripId,
          user_id: user.id,
          text: itemText,
          category,
          priority,
          is_completed: isCompleted,
          sort_order: items.length + idx,
        });
      });

      if (newItems.length === 0) {
        toast({ title: 'לא נמצאו פריטים בקובץ', variant: 'destructive' });
        return;
      }

      const { data, error } = await supabase
        .from('checklist_items')
        .insert(newItems)
        .select();

      if (error) {
        toast({ title: 'שגיאה בייבוא', description: error.message, variant: 'destructive' });
      } else {
        setItems(prev => [...prev, ...((data as any[]) || [])]);
        toast({ title: `יובאו ${newItems.length} פריטים בהצלחה! 🎉` });
      }
    };
    input.click();
  };

  if (loading) {
    return (
      <div className="card-surface p-12 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }


  return (
    <div className="space-y-4 animate-fade-in">
      {/* Progress + Export/Import */}
      {totalCount > 0 && (
        <div className="card-surface p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              {completedCount}/{totalCount} הושלמו
            </span>
            <div className="flex items-center gap-2">
              <button onClick={exportCSV} className="btn-ghost flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" title="ייצוא CSV">
                <Download className="h-3.5 w-3.5" /> ייצוא
              </button>
              <button onClick={importCSV} className="btn-ghost flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" title="ייבוא CSV">
                <Upload className="h-3.5 w-3.5" /> ייבוא
              </button>
              <span className="text-xs text-muted-foreground">
                {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
              </span>
            </div>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Add new item */}
      <div className="card-surface p-4 space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="הוסף פריט חדש..."
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addItem(); }}
            className="flex-1"
          />
          <button
            onClick={addItem}
            disabled={!newText.trim()}
            className="btn-primary px-4 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setNewCategory(cat.value)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                newCategory === cat.value
                  ? 'bg-primary/10 text-primary border-primary/30 shadow-sm'
                  : 'bg-card border-border text-muted-foreground hover:border-primary/30'
              }`}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
          <button
            onClick={() => setNewPriority(p => p === 'high' ? 'normal' : 'high')}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
              newPriority === 'high'
                ? 'bg-accent/10 text-accent border-accent/30 shadow-sm'
                : 'bg-card border-border text-muted-foreground hover:border-accent/30'
            }`}
          >
            ⭐ עדיפות גבוהה
          </button>
        </div>
      </div>

      {/* Filters */}
      {totalCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <button
            onClick={() => setFilterCategory(null)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
              filterCategory === null
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-card border-border text-muted-foreground hover:border-primary/30'
            }`}
          >
            הכל ({totalCount})
          </button>
          {CATEGORIES.map(cat => {
            const count = items.filter(i => i.category === cat.value).length;
            if (count === 0) return null;
            return (
              <button
                key={cat.value}
                onClick={() => setFilterCategory(filterCategory === cat.value ? null : cat.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  filterCategory === cat.value
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-card border-border text-muted-foreground hover:border-primary/30'
                }`}
              >
                {cat.emoji} {cat.label} ({count})
              </button>
            );
          })}
          <button
            onClick={() => setHideCompleted(!hideCompleted)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
              hideCompleted
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-card border-border text-muted-foreground hover:border-primary/30'
            }`}
          >
            {hideCompleted ? '👁️ הצג הושלמו' : '🙈 הסתר הושלמו'}
          </button>
        </div>
      )}

      {/* Items list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-muted-foreground">
            {totalCount === 0 ? 'הרשימה ריקה — הוסף פריט ראשון!' : 'אין פריטים מתאימים לסינון'}
          </p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedFiltered.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {sortedFiltered.map(item => (
                <SortableChecklistItem
                  key={item.id}
                  item={item}
                  onToggleComplete={toggleComplete}
                  onTogglePriority={togglePriority}
                  onDelete={deleteItem}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};

export default TripChecklist;
