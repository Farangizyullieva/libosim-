import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, ImagePlus, MapPin } from 'lucide-react';
import { donationsService } from '../services/donations.service';
import { uploadsService, toAbsoluteUploadUrl } from '../services/uploads.service';
import { useCategoriesStore } from '../store/categories.store';
import { useToastStore } from '../store/toast.store';
import { extractErrorMessage } from '../services/api-client';
import type {
  DonationAgeGroup,
  DonationCondition,
  DonationGender,
} from '../types';
import { Button } from '../components/Button';
import { PageHeader } from '../components/PageHeader';
import { categoryName } from '../utils/category';

const CONDITIONS: DonationCondition[] = ['NEW', 'LIKE_NEW', 'GOOD', 'USED'];
const GENDERS: DonationGender[] = ['MEN', 'WOMEN', 'UNISEX', 'KIDS'];
const AGE_GROUPS: DonationAgeGroup[] = ['ADULT', 'TEEN', 'CHILD', 'INFANT'];
const MAX_IMAGES = 8;

export default function CreateDonationPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { categories, fetch: fetchCategories } = useCategoriesStore();
  const push = useToastStore((s) => s.push);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [size, setSize] = useState('');
  const [condition, setCondition] = useState<DonationCondition>('GOOD');
  const [gender, setGender] = useState<DonationGender>('UNISEX');
  const [ageGroup, setAgeGroup] = useState<DonationAgeGroup>('ADULT');
  const [quantity, setQuantity] = useState(1);
  const [location, setLocation] = useState('');
  const [locating, setLocating] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (!id) return;
    donationsService.getOne(id).then((d) => {
      setTitle(d.title);
      setDescription(d.description);
      setCategoryId(d.categoryId);
      setSize(d.size ?? '');
      setCondition(d.condition);
      setGender(d.gender);
      setAgeGroup(d.ageGroup);
      setQuantity(d.quantity);
      setLocation(d.location ?? '');
      setImages(d.images);
    });
  }, [id]);

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const remaining = MAX_IMAGES - images.length;
    const toUpload = files.slice(0, remaining);

    setUploading(true);
    try {
      const urls = await uploadsService.uploadImages(toUpload);
      setImages((prev) => [...prev, ...urls]);
    } catch (err) {
      push(extractErrorMessage(err), 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function removeImage(url: string) {
    setImages((prev) => prev.filter((u) => u !== url));
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      push(t('donationForm.geolocationUnsupported'), 'error');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const coords = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=${i18n.language}`,
          );
          const data = await res.json();
          const addr = data?.address ?? {};
          const parts = [
            addr.suburb || addr.neighbourhood || addr.road,
            addr.city || addr.town || addr.village || addr.county,
          ].filter(Boolean);
          setLocation(parts.length > 0 ? parts.join(', ') : coords);
        } catch {
          setLocation(coords);
        } finally {
          setLocating(false);
        }
      },
      () => {
        push(t('donationForm.geolocationDenied'), 'error');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      title,
      description,
      categoryId: categoryId || undefined,
      size: size || undefined,
      condition,
      gender,
      ageGroup,
      quantity,
      location: location || undefined,
      images,
    };

    try {
      if (isEdit && id) {
        await donationsService.update(id, payload);
        push(t('donationForm.toastUpdated'));
        // replace: "back" from the donation page shouldn't reopen the form.
        navigate(`/donations/${id}`, { replace: true, state: { saved: 'updated' } });
      } else {
        const created = await donationsService.create(payload);
        push(t('donationForm.toastCreated'));
        navigate(`/donations/${created.id}`, {
          replace: true,
          state: { saved: created.status === 'PENDING_REVIEW' ? 'review' : 'created' },
        });
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <PageHeader
        title={isEdit ? t('common.edit') : t('nav.donate')}
        description={t('donationForm.noticeText')}
      />

      <form
        onSubmit={handleSubmit}
        className="mt-6 flex flex-col gap-5 rounded-xl border border-border bg-surface p-5 sm:p-6"
      >
        <div>
          <label className="text-sm font-medium text-text">{t('donationForm.titleLabel')}</label>
          <input
            required
            minLength={3}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-text">{t('donationForm.descriptionLabel')}</label>
          <textarea
            required
            minLength={10}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-text">{t('donations.category')}</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text"
          >
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {categoryName(t, c)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-text">{t('donations.condition')}</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as DonationCondition)}
              className="mt-1.5 w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text"
            >
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {t(`conditions.${c}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-text">{t('donations.size')}</label>
            <input
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder={t('donationForm.sizePlaceholder') ?? ''}
              className="mt-1.5 w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-text">{t('donations.gender')}</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as DonationGender)}
              className="mt-1.5 w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text"
            >
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {t(`genders.${g}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-text">{t('donations.ageGroup')}</label>
            <select
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value as DonationAgeGroup)}
              className="mt-1.5 w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text"
            >
              {AGE_GROUPS.map((a) => (
                <option key={a} value={a}>
                  {t(`ageGroups.${a}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-text">{t('donations.quantity')}</label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
              className="mt-1.5 w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text">{t('donations.location')}</label>
            <div className="mt-1.5 flex gap-2">
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t('donationForm.locationPlaceholder') ?? ''}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text"
              />
              <button
                type="button"
                onClick={handleUseMyLocation}
                disabled={locating}
                aria-label={t('donationForm.useMyLocation') ?? ''}
                title={t('donationForm.useMyLocation') ?? ''}
                className="flex shrink-0 items-center justify-center rounded-lg border border-border bg-bg px-3 text-text-muted hover:bg-accent-soft hover:text-accent disabled:opacity-50"
              >
                <MapPin size={18} />
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-text">{t('donationForm.photosLabel')}</label>
          <p className="mt-1 text-xs text-text-muted">{t('donationForm.photosHelp')}</p>

          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {images.map((url) => (
              <div key={url} className="relative aspect-square overflow-hidden rounded-lg border border-border">
                <img src={toAbsoluteUploadUrl(url)} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(url)}
                  aria-label={t('donationForm.removePhoto') ?? ''}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                >
                  <X size={12} />
                </button>
              </div>
            ))}

            {images.length < MAX_IMAGES && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-text-muted hover:bg-accent-soft disabled:opacity-50"
              >
                <ImagePlus size={20} />
                <span className="text-[11px]">
                  {uploading ? t('donationForm.uploading') : t('donationForm.addPhotos')}
                </span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={handleFilesSelected}
            className="hidden"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
        )}

        <Button type="submit" size="lg" loading={loading} className="mt-1 w-full">
          {t('common.submit')}
        </Button>
      </form>
    </div>
  );
}
