import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Plus, CheckSquare, Square, Star, Trash2, ShoppingBag, ClipboardList, StickyNote, Plane, Filter, Download, Upload, GripVertical, ChevronDown, ChevronLeft, CornerDownLeft, CalendarDays, User } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { he } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
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
  parent_id: string | null;
  due_date: string | null;
  assignee: string | null;
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
  subtasks: ChecklistItem[];
  isSubtask?: boolean;
  onToggleComplete: (item: ChecklistItem) => void;
  onTogglePriority: (item: ChecklistItem) => void;
  onDelete: (id: string) => void;
  onAddSubtask: (parentId: string) => void;
  onUpdateField: (id: string, field: string, value: any) => void;
  collapsedParents: Set<string>;
  onToggleCollapse: (id: string) => void;
}

const SortableChecklistItem: React.FC<SortableChecklistItemProps> = ({
  item, subtasks, isSubtask, onToggleComplete, onTogglePriority, onDelete, onAddSubtask, collapsedParents, onToggleCollapse
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.8 : undefined,
  };
  const catConfig = getCategoryConfig(item.category);
  const isCollapsed = collapsedParents.has(item.id);
  const completedSubtasks = subtasks.filter(s => s.is_completed).length;

  return (
    <div>
      <div
        ref={setNodeRef}
        style={style}
        className={`group p-3 flex items-center gap-3 transition-all border rounded-lg ${
          isSubtask ? 'mr-8 bg-muted/30 border-border/50' : 'card-surface'
        } ${item.is_completed ? 'opacity-60' : ''} ${
          item.priority === 'high' && !item.is_completed ? 'border-accent/30 bg-accent/5' : ''
        }`}
      >
        <button {...attributes} {...listeners} className="flex-shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground touch-none">
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Collapse toggle for parents with subtasks */}
        {!isSubtask && subtasks.length > 0 && (
          <button onClick={() => onToggleCollapse(item.id)} className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors">
            {isCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}

        <button onClick={() => onToggleComplete(item)} className="flex-shrink-0 text-primary hover:scale-110 transition-transform">
          {item.is_completed ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5 text-muted-foreground" />}
        </button>

        {!isSubtask && (
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">{catConfig.emoji}</span>
        )}

        <span className={`flex-1 text-sm ${item.is_completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
          {item.text}
          {!isSubtask && subtasks.length > 0 && (
            <span className="text-xs text-muted-foreground mr-2">
              ({completedSubtasks}/{subtasks.length})
            </span>
          )}
        </span>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isSubtask && (
            <button
              onClick={() => onAddSubtask(item.id)}
              className="p-1 text-muted-foreground/40 hover:text-primary rounded transition-colors"
              title="הוסף תת-משימה"
            >
              <CornerDownLeft className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={() => onTogglePriority(item)} className={`p-1 rounded transition-colors ${item.priority === 'high' ? 'text-accent' : 'text-muted-foreground/40 hover:text-accent'}`} title="עדיפות">
            <Star className={`h-3.5 w-3.5 ${item.priority === 'high' ? 'fill-accent' : ''}`} />
          </button>
          <button onClick={() => onDelete(item.id)} className="p-1 text-muted-foreground/40 hover:text-destructive rounded transition-colors" title="מחק">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
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
  const [collapsedParents, setCollapsedParents] = useState<Set<string>>(new Set());
  const [addingSubtaskFor, setAddingSubtaskFor] = useState<string | null>(null);
  const [subtaskText, setSubtaskText] = useState('');

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

  // Separate parents and subtasks
  const parentItems = useMemo(() => items.filter(i => !i.parent_id), [items]);
  const subtaskMap = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>();
    items.filter(i => i.parent_id).forEach(i => {
      const arr = map.get(i.parent_id!) || [];
      arr.push(i);
      map.set(i.parent_id!, arr);
    });
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    return parentItems.filter(item => {
      if (filterCategory && item.category !== filterCategory) return false;
      if (hideCompleted && item.is_completed) return false;
      return true;
    });
  }, [parentItems, filterCategory, hideCompleted]);

  const sortedFiltered = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
      if (a.priority !== b.priority) return a.priority === 'high' ? -1 : 1;
      return a.sort_order - b.sort_order;
    });
  }, [filtered]);

  // Build flat list of ids for DnD (parents + visible subtasks)
  const flatItemIds = useMemo(() => {
    const ids: string[] = [];
    sortedFiltered.forEach(parent => {
      ids.push(parent.id);
      if (!collapsedParents.has(parent.id)) {
        const subs = subtaskMap.get(parent.id) || [];
        subs.sort((a, b) => a.sort_order - b.sort_order).forEach(s => ids.push(s.id));
      }
    });
    return ids;
  }, [sortedFiltered, subtaskMap, collapsedParents]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = flatItemIds.indexOf(active.id as string);
    const newIndex = flatItemIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    // Only allow reorder among same level (both parents or both subtasks of same parent)
    const draggedItem = items.find(i => i.id === active.id);
    const targetItem = items.find(i => i.id === over.id);
    if (!draggedItem || !targetItem) return;
    if (draggedItem.parent_id !== targetItem.parent_id) return;

    const siblings = draggedItem.parent_id
      ? (subtaskMap.get(draggedItem.parent_id) || []).sort((a, b) => a.sort_order - b.sort_order)
      : sortedFiltered;

    const oldSibIdx = siblings.findIndex(i => i.id === active.id);
    const newSibIdx = siblings.findIndex(i => i.id === over.id);
    if (oldSibIdx === -1 || newSibIdx === -1) return;

    const reordered = arrayMove(siblings, oldSibIdx, newSibIdx);
    const updates = reordered.map((item, idx) => ({ ...item, sort_order: idx }));
    setItems(prev => {
      const reorderedIds = new Set(updates.map(u => u.id));
      const unchanged = prev.filter(i => !reorderedIds.has(i.id));
      return [...unchanged, ...updates].sort((a, b) => a.sort_order - b.sort_order);
    });

    const promises = updates.map((item, idx) =>
      supabase.from('checklist_items').update({ sort_order: idx }).eq('id', item.id)
    );
    await Promise.all(promises);
  }, [flatItemIds, items, sortedFiltered, subtaskMap]);

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
      sort_order: parentItems.length,
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

  const addSubtask = async (parentId: string) => {
    if (!subtaskText.trim() || !user) return;
    const parentItem = items.find(i => i.id === parentId);
    const existingSubs = subtaskMap.get(parentId) || [];
    const newItem = {
      trip_id: tripId,
      user_id: user.id,
      text: subtaskText.trim(),
      category: parentItem?.category || 'task',
      priority: 'normal',
      sort_order: existingSubs.length,
      parent_id: parentId,
    };
    const { data, error } = await supabase
      .from('checklist_items')
      .insert(newItem)
      .select()
      .single();
    if (error) {
      toast({ title: 'שגיאה בהוספת תת-משימה', variant: 'destructive' });
    } else {
      setItems(prev => [...prev, data as any]);
      setSubtaskText('');
      setAddingSubtaskFor(null);
      // Ensure parent is expanded
      setCollapsedParents(prev => {
        const next = new Set(prev);
        next.delete(parentId);
        return next;
      });
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
    // Also remove subtasks from local state (DB cascade handles it)
    setItems(prev => prev.filter(i => i.id !== id && i.parent_id !== id));
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

  const toggleCollapse = (id: string) => {
    setCollapsedParents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddSubtaskClick = (parentId: string) => {
    setAddingSubtaskFor(addingSubtaskFor === parentId ? null : parentId);
    setSubtaskText('');
  };

  const exportExcel = () => {
    const rows = items.map(item => {
      const cat = getCategoryConfig(item.category);
      const parentItem = item.parent_id ? items.find(i => i.id === item.parent_id) : null;
      return {
        'טקסט': item.parent_id ? `  ↳ ${item.text}` : item.text,
        'קטגוריה': cat.label,
        'עדיפות': item.priority === 'high' ? 'גבוהה' : 'רגילה',
        'הושלם': item.is_completed ? 'כן' : 'לא',
        'משימת אב': parentItem?.text || '',
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'צ׳קליסט');
    ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 8 }, { wch: 20 }];
    XLSX.writeFile(wb, `checklist_${tripId.slice(0, 8)}.xlsx`);
    toast({ title: 'הצ\'קליסט יוצא בהצלחה! 📥' });
  };

  const importExcel = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !user) return;

      const categoryMap: Record<string, string> = {
        'לפני הטיול': 'before_trip', 'קניות': 'shopping', 'משימה': 'task', 'הערה': 'note',
        'before_trip': 'before_trip', 'shopping': 'shopping', 'task': 'task', 'note': 'note',
      };

      try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

        if (rows.length === 0) {
          toast({ title: 'הקובץ ריק', variant: 'destructive' });
          return;
        }

        const newItems = rows.map((row, idx) => {
          let itemText = row['טקסט'] || row['text'] || Object.values(row)[0] || '';
          // Strip subtask prefix
          itemText = String(itemText).replace(/^\s*↳\s*/, '').trim();
          if (!itemText) return null;

          const catRaw = row['קטגוריה'] || row['category'] || '';
          const category = categoryMap[catRaw] || 'task';
          const priorityRaw = row['עדיפות'] || row['priority'] || '';
          const priority = priorityRaw.includes('גבוהה') || priorityRaw.toLowerCase() === 'high' ? 'high' : 'normal';
          const completedRaw = row['הושלם'] || row['completed'] || '';
          const is_completed = completedRaw.includes('כן') || completedRaw.toLowerCase() === 'yes';

          return {
            trip_id: tripId, user_id: user.id, text: itemText, category, priority, is_completed,
            sort_order: items.length + idx,
          };
        }).filter(Boolean) as Array<{
          trip_id: string; user_id: string; text: string; category: string;
          priority: string; is_completed: boolean; sort_order: number;
        }>;

        if (newItems.length === 0) {
          toast({ title: 'לא נמצאו פריטים בקובץ', variant: 'destructive' });
          return;
        }

        const { data, error } = await supabase.from('checklist_items').insert(newItems).select();
        if (error) {
          toast({ title: 'שגיאה בייבוא', description: error.message, variant: 'destructive' });
        } else {
          setItems(prev => [...prev, ...((data as any[]) || [])]);
          toast({ title: `יובאו ${newItems.length} פריטים בהצלחה! 🎉` });
        }
      } catch {
        toast({ title: 'שגיאה בקריאת הקובץ', variant: 'destructive' });
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
              <button onClick={exportExcel} className="btn-ghost flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" title="ייצוא Excel">
                <Download className="h-3.5 w-3.5" /> ייצוא
              </button>
              <button onClick={importExcel} className="btn-ghost flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" title="ייבוא Excel">
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
          <button onClick={addItem} disabled={!newText.trim()} className="btn-primary px-4 disabled:opacity-50">
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
              filterCategory === null ? 'bg-primary/10 text-primary border-primary/30' : 'bg-card border-border text-muted-foreground hover:border-primary/30'
            }`}
          >
            הכל ({parentItems.length})
          </button>
          {CATEGORIES.map(cat => {
            const count = parentItems.filter(i => i.category === cat.value).length;
            if (count === 0) return null;
            return (
              <button
                key={cat.value}
                onClick={() => setFilterCategory(filterCategory === cat.value ? null : cat.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  filterCategory === cat.value ? 'bg-primary/10 text-primary border-primary/30' : 'bg-card border-border text-muted-foreground hover:border-primary/30'
                }`}
              >
                {cat.emoji} {cat.label} ({count})
              </button>
            );
          })}
          <button
            onClick={() => setHideCompleted(!hideCompleted)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
              hideCompleted ? 'bg-primary/10 text-primary border-primary/30' : 'bg-card border-border text-muted-foreground hover:border-primary/30'
            }`}
          >
            {hideCompleted ? '👁️ הצג הושלמו' : '🙈 הסתר הושלמו'}
          </button>
        </div>
      )}

      {/* Items list */}
      {sortedFiltered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-muted-foreground mb-3">
            {totalCount === 0 ? 'הרשימה ריקה — הוסף פריט ראשון!' : 'אין פריטים מתאימים לסינון'}
          </p>
          {totalCount === 0 && (
            <button onClick={importExcel} className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
              <Upload className="h-3.5 w-3.5" /> או ייבא מקובץ Excel
            </button>
          )}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={flatItemIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {sortedFiltered.map(parent => {
                const subs = (subtaskMap.get(parent.id) || []).sort((a, b) => a.sort_order - b.sort_order);
                const isCollapsed = collapsedParents.has(parent.id);
                return (
                  <React.Fragment key={parent.id}>
                    <SortableChecklistItem
                      item={parent}
                      subtasks={subs}
                      onToggleComplete={toggleComplete}
                      onTogglePriority={togglePriority}
                      onDelete={deleteItem}
                      onAddSubtask={handleAddSubtaskClick}
                      collapsedParents={collapsedParents}
                      onToggleCollapse={toggleCollapse}
                    />
                    {/* Subtasks */}
                    {!isCollapsed && subs.map(sub => (
                      <SortableChecklistItem
                        key={sub.id}
                        item={sub}
                        subtasks={[]}
                        isSubtask
                        onToggleComplete={toggleComplete}
                        onTogglePriority={togglePriority}
                        onDelete={deleteItem}
                        onAddSubtask={handleAddSubtaskClick}
                        collapsedParents={collapsedParents}
                        onToggleCollapse={toggleCollapse}
                      />
                    ))}
                    {/* Inline add subtask */}
                    {addingSubtaskFor === parent.id && (
                      <div className="mr-8 flex gap-2 items-center">
                        <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <Input
                          placeholder="הוסף תת-משימה..."
                          value={subtaskText}
                          onChange={e => setSubtaskText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') addSubtask(parent.id); if (e.key === 'Escape') setAddingSubtaskFor(null); }}
                          className="flex-1 h-8 text-sm"
                          autoFocus
                        />
                        <button
                          onClick={() => addSubtask(parent.id)}
                          disabled={!subtaskText.trim()}
                          className="btn-primary px-3 h-8 text-xs disabled:opacity-50"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};

export default TripChecklist;
