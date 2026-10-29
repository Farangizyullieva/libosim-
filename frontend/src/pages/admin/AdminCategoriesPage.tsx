import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2, X } from 'lucide-react';
import { categoriesService } from '../../services/categories.service';
import type { Category } from '../../types';
import { useToastStore } from '../../store/toast.store';
import { extractErrorMessage } from '../../services/api-client';
import { Loader, EmptyState } from '../../components/Feedback';
import { Button } from '../../components/Button';

export default function AdminCategoriesPage() {
  const { t } = useTranslation();
  const push = useToastStore((s) => s.push);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  async function load() {
    const res = await categoriesService.list();
    setCategories(res);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await categoriesService.create(newName.trim());
      setNewName('');
      load();
    } catch (err) {
      push(extractErrorMessage(err), 'error');
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) return;
    try {
      await categoriesService.update(id, editName.trim());
      setEditingId(null);
      load();
    } catch (err) {
      push(extractErrorMessage(err), 'error');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t('admin.confirmDeleteCategory') ?? '')) return;
    try {
      await categoriesService.remove(id);
      load();
    } catch (err) {
      push(extractErrorMessage(err), 'error');
    }
  }

  return (
    <div className="px-4 py-6 sm:px-6">
      <h1 className="font-display text-2xl text-text">{t('admin.categories')}</h1>

      <form onSubmit={handleCreate} className="mt-5 flex max-w-xl gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t('admin.categoryNamePlaceholder') ?? undefined}
          className="flex-1 rounded-lg border border-border bg-surface px-4 py-2.5 text-text"
        />
        <Button type="submit" loading={creating}>
          {t('admin.addCategory')}
        </Button>
      </form>

      <div className="mt-6">
        {!categories ? (
          <Loader />
        ) : categories.length === 0 ? (
          <EmptyState title={t('donations.noResults')} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
                {editingId === c.id ? (
                  <>
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-text"
                    />
                    <Button size="sm" onClick={() => handleUpdate(c.id)}>
                      {t('common.save')}
                    </Button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-full p-2 text-text-muted hover:bg-accent-soft hover:text-text"
                      aria-label={t('common.cancel') ?? undefined}
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium text-text">{c.name}</span>
                    <button
                      onClick={() => {
                        setEditingId(c.id);
                        setEditName(c.name);
                      }}
                      className="rounded-full p-2 text-text-muted hover:bg-accent-soft hover:text-text"
                      aria-label={t('common.edit') ?? undefined}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="rounded-full p-2 text-text-muted hover:bg-danger/10 hover:text-danger"
                      aria-label={t('common.delete') ?? undefined}
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
