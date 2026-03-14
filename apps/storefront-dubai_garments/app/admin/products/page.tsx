'use client';

import Link from 'next/link';
import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';
import AdminPageHeader from '@/components/admin/common/page-header';
import AdminShell from '@/components/admin/admin-shell';
import {
  DataTable,
  FieldGroup,
  FieldHint,
  FieldLabel,
  Modal,
  PageShell,
  Panel,
  StatusBadge,
  TableCell,
  TableHeadCell,
  TableHeadRow,
  TableRow,
  TextAreaField,
  TextField,
  Toolbar,
} from '@/components/ui';
import { ProductCategory } from '@/features/products/types/product.types';
import { formatDateTime } from '@/features/admin/shared/view-format';
import {
  BRANDING_OPTIONS,
  CATEGORY_OPTIONS,
  COLOR_OPTIONS,
  MATERIAL_OPTIONS,
  SIZE_OPTIONS,
  TAG_OPTIONS,
} from '@/features/products/data/admin-product-form-options';

type AdminProduct = {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  shortDescription: string | null;
  description: string | null;
  material: string | null;
  minOrderQty: number;
  leadTimeDays: number;
  isActive: boolean;
  featured: boolean;
  tags: string[];
  colors: string[];
  sizes: string[];
  brandingOptions: string[];
  image: string;
  updatedAt: string;
  createdAt: string;
  variants?: AdminProductVariant[];
};

type AdminProductVariant = {
  id?: string;
  sku: string;
  variantName: string;
  size?: string | null;
  color?: string | null;
  unitPrice: number;
  moq: number;
  isActive: boolean;
};

type ProductFormState = {
  name: string;
  slug: string;
  category: ProductCategory;
  shortDescription: string;
  description: string;
  material: string;
  minOrderQty: string;
  leadTimeDays: string;
  tags: string;
  colors: string;
  sizes: string;
  brandingOptions: string;
  image: string;
  isActive: boolean;
  featured: boolean;
  variants: AdminProductVariant[];
};

const EMPTY_FORM: ProductFormState = {
  name: '',
  slug: '',
  category: 'tshirts',
  shortDescription: '',
  description: '',
  material: '',
  minOrderQty: '1',
  leadTimeDays: '7',
  tags: '',
  colors: '',
  sizes: '',
  brandingOptions: '',
  image: '',
  isActive: true,
  featured: false,
  variants: [],
};

function formatCategoryLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function csv(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function toggleCsvValue(value: string, item: string) {
  const current = csv(value);
  const exists = current.some((entry) => entry.toLowerCase() === item.toLowerCase());
  if (exists) {
    return current.filter((entry) => entry.toLowerCase() !== item.toLowerCase()).join(', ');
  }
  return [...current, item].join(', ');
}

function hasCsvValue(value: string, item: string) {
  return csv(value).some((entry) => entry.toLowerCase() === item.toLowerCase());
}

async function readResponsePayload(response: Response): Promise<Record<string, unknown>> {
  const raw = await response.text();
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function toFormState(product: AdminProduct): ProductFormState {
  return {
    name: product.name,
    slug: product.slug,
    category: product.category,
    shortDescription: product.shortDescription || '',
    description: product.description || '',
    material: product.material || '',
    minOrderQty: String(product.minOrderQty),
    leadTimeDays: String(product.leadTimeDays),
    tags: product.tags.join(', '),
    colors: product.colors.join(', '),
    sizes: product.sizes.join(', '),
    brandingOptions: product.brandingOptions.join(', '),
    image: product.image || '',
    isActive: product.isActive,
    featured: product.featured,
    variants: (product.variants || []).map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      variantName: variant.variantName,
      size: variant.size || '',
      color: variant.color || '',
      unitPrice: Number(variant.unitPrice || 0),
      moq: Number(variant.moq || 1),
      isActive: Boolean(variant.isActive),
    })),
  };
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ProductCategory>('all');
  const [showInactive, setShowInactive] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState('');

  const [createForm, setCreateForm] = useState<ProductFormState>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<ProductFormState>(EMPTY_FORM);
  const [editTarget, setEditTarget] = useState<AdminProduct | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((item) => {
      const matchesSearch = !query ||
        item.name.toLowerCase().includes(query) ||
        item.slug.toLowerCase().includes(query) ||
        item.tags.some((tag) => tag.toLowerCase().includes(query));
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [categoryFilter, products, search]);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (showInactive) params.set('includeInactive', 'true');
      const response = await fetch(`/api/admin/products?${params.toString()}`, { cache: 'no-store' });
      const payload = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error(String(payload?.message || `Failed to load products (${response.status}).`));
      }
      setProducts(Array.isArray(payload.items) ? (payload.items as AdminProduct[]) : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load products.');
    } finally {
      setIsLoading(false);
    }
  }, [showInactive]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  function openCreateModal() {
    setCreateForm(EMPTY_FORM);
    setFormError('');
    setCreateModalOpen(true);
  }

  function closeCreateModal() {
    if (isSaving) return;
    setCreateModalOpen(false);
    setFormError('');
  }

  function openEditModal(product: AdminProduct) {
    setEditTarget(product);
    setEditForm(toFormState(product));
    setFormError('');
    setEditModalOpen(true);
  }

  function closeEditModal() {
    if (isSaving) return;
    setEditModalOpen(false);
    setEditTarget(null);
    setFormError('');
  }

  function openDeleteModal(product: AdminProduct) {
    setDeleteTarget(product);
    setFormError('');
    setDeleteModalOpen(true);
  }

  function closeDeleteModal() {
    if (isDeleting) return;
    setDeleteModalOpen(false);
    setDeleteTarget(null);
    setFormError('');
  }

  async function submitCreate() {
    if (!createForm.name.trim()) {
      setFormError('Product name is required.');
      return;
    }

    setIsSaving(true);
    setFormError('');
    try {
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createForm,
          slug: toSlug(createForm.slug || createForm.name),
          minOrderQty: Number(createForm.minOrderQty || 1),
          leadTimeDays: Number(createForm.leadTimeDays || 7),
          tags: csv(createForm.tags),
          colors: csv(createForm.colors),
          sizes: csv(createForm.sizes),
          brandingOptions: csv(createForm.brandingOptions),
          variants: createForm.variants.map((variant) => ({
            sku: variant.sku.trim(),
            variantName: variant.variantName.trim(),
            size: String(variant.size || '').trim() || null,
            color: String(variant.color || '').trim() || null,
            unitPrice: Number(variant.unitPrice || 0),
            moq: Number(variant.moq || 1),
            isActive: variant.isActive,
          })),
        }),
      });
      const payload = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error(String(payload?.message || `Failed to create product (${response.status}).`));
      }
      if (payload.item) {
        setProducts((previous) => [payload.item as AdminProduct, ...previous]);
      } else {
        await loadProducts();
      }
      setActionMessage('Product created successfully.');
      closeCreateModal();
    } catch (createError) {
      setFormError(createError instanceof Error ? createError.message : 'Failed to create product.');
    } finally {
      setIsSaving(false);
    }
  }

  async function submitEdit() {
    if (!editTarget) return;
    if (!editForm.name.trim()) {
      setFormError('Product name is required.');
      return;
    }

    setIsSaving(true);
    setFormError('');
    try {
      const response = await fetch(`/api/admin/products/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          slug: toSlug(editForm.slug || editForm.name),
          minOrderQty: Number(editForm.minOrderQty || 1),
          leadTimeDays: Number(editForm.leadTimeDays || 7),
          tags: csv(editForm.tags),
          colors: csv(editForm.colors),
          sizes: csv(editForm.sizes),
          brandingOptions: csv(editForm.brandingOptions),
          variants: editForm.variants.map((variant) => ({
            sku: variant.sku.trim(),
            variantName: variant.variantName.trim(),
            size: String(variant.size || '').trim() || null,
            color: String(variant.color || '').trim() || null,
            unitPrice: Number(variant.unitPrice || 0),
            moq: Number(variant.moq || 1),
            isActive: variant.isActive,
          })),
        }),
      });
      const payload = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error(String(payload?.message || `Failed to update product (${response.status}).`));
      }
      if (payload.item) {
        setProducts((previous) => previous.map((item) => (item.id === editTarget.id ? (payload.item as AdminProduct) : item)));
      } else {
        await loadProducts();
      }
      setActionMessage('Product updated successfully.');
      closeEditModal();
    } catch (updateError) {
      setFormError(updateError instanceof Error ? updateError.message : 'Failed to update product.');
    } finally {
      setIsSaving(false);
    }
  }

  async function submitDelete() {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setFormError('');
    try {
      const response = await fetch(`/api/admin/products/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const payload = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error(String(payload?.message || `Failed to archive product (${response.status}).`));
      }
      if (payload.item) {
        setProducts((previous) => previous.map((item) => (item.id === deleteTarget.id ? (payload.item as AdminProduct) : item)));
      } else {
        await loadProducts();
      }
      setActionMessage('Product archived successfully.');
      closeDeleteModal();
    } catch (deleteError) {
      setFormError(deleteError instanceof Error ? deleteError.message : 'Failed to archive product.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AdminShell>
      <PageShell density="compact">
        <Panel>
          <AdminPageHeader
            title="Products"
            subtitle="Dedicated product catalog management with create/edit/archive controls."
            actions={
              <Toolbar>
                <Link href="/products" className="ui-btn ui-btn-secondary ui-btn-md">
                  Public Catalog
                </Link>
                <button type="button" className="ui-btn ui-btn-primary ui-btn-md" onClick={openCreateModal}>
                  New Product
                </button>
              </Toolbar>
            }
          />

          <div className="dg-form-row">
            <FieldGroup className="dg-col-fill">
              <FieldLabel htmlFor="products-search">Search</FieldLabel>
              <TextField
                id="products-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, slug, or tag..."
              />
              <FieldHint>Real-time filtering for product management.</FieldHint>
            </FieldGroup>

            <FieldGroup>
              <FieldLabel htmlFor="products-category">Category</FieldLabel>
              <select
                id="products-category"
                className="dg-select dg-select-md"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value as 'all' | ProductCategory)}
              >
                <option value="all">All Categories</option>
                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>
                    {formatCategoryLabel(category)}
                  </option>
                ))}
              </select>
            </FieldGroup>

            <FieldGroup>
              <FieldLabel htmlFor="products-show-inactive">Visibility</FieldLabel>
              <label id="products-show-inactive" className="dg-help">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(event) => setShowInactive(event.target.checked)}
                />{' '}
                Include inactive
              </label>
            </FieldGroup>
          </div>
        </Panel>

        <Panel>
          <div className="dg-admin-head">
            <h2 className="dg-title-sm">Catalog Items</h2>
            <span className="dg-badge">{filteredProducts.length} Visible</span>
          </div>

          {actionMessage ? (
            <p className="dg-alert-success">{actionMessage}</p>
          ) : null}
          {isLoading ? <p className="dg-muted-sm">Loading products...</p> : null}
          {error ? <p className="dg-alert-error">{error}</p> : null}

          {!isLoading && !error ? (
            <DataTable density="compact">
              <thead>
                <TableHeadRow>
                  <TableHeadCell>Product</TableHeadCell>
                  <TableHeadCell>Category</TableHeadCell>
                  <TableHeadCell>MOQ</TableHeadCell>
                  <TableHeadCell>Lead Time</TableHeadCell>
                  <TableHeadCell>Status</TableHeadCell>
                  <TableHeadCell>Variants</TableHeadCell>
                  <TableHeadCell>Updated</TableHeadCell>
                  <TableHeadCell>Actions</TableHeadCell>
                </TableHeadRow>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8}>No products found.</TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div>{product.name}</div>
                        <div className="dg-help">/{product.slug}</div>
                      </TableCell>
                      <TableCell>{formatCategoryLabel(product.category)}</TableCell>
                      <TableCell>{product.minOrderQty}</TableCell>
                      <TableCell>{product.leadTimeDays} days</TableCell>
                      <TableCell>
                        <div className="dg-form-row">
                          <StatusBadge status={product.isActive ? 'success' : 'danger'}>
                            {product.isActive ? 'active' : 'inactive'}
                          </StatusBadge>
                          {product.featured ? <StatusBadge status="info">featured</StatusBadge> : null}
                        </div>
                      </TableCell>
                      <TableCell>{product.variants?.length || 0}</TableCell>
                      <TableCell>{formatDateTime(product.updatedAt)}</TableCell>
                      <TableCell>
                        <div className="dg-form-row">
                          <button
                            type="button"
                            className="ui-btn ui-btn-secondary ui-btn-md"
                            onClick={() => openEditModal(product)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="ui-btn ui-btn-secondary ui-btn-md"
                            onClick={() => openDeleteModal(product)}
                          >
                            Archive
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </tbody>
            </DataTable>
          ) : null}
        </Panel>
      </PageShell>

      <Modal open={createModalOpen} onClose={closeCreateModal}>
        <div className="dg-card p-5 sm:p-6">
          <div className="dg-admin-head">
            <h2 className="dg-title-sm">Create Product</h2>
            <span className="dg-badge">Admin Only</span>
          </div>
          {renderProductForm(
            createForm,
            setCreateForm,
            formError,
            isSaving,
            submitCreate,
            closeCreateModal,
            'Create Product'
          )}
        </div>
      </Modal>

      <Modal open={editModalOpen} onClose={closeEditModal}>
        <div className="dg-card p-5 sm:p-6">
          <div className="dg-admin-head">
            <h2 className="dg-title-sm">Edit Product</h2>
            <span className="dg-badge">Admin Only</span>
          </div>
          {renderProductForm(
            editForm,
            setEditForm,
            formError,
            isSaving,
            submitEdit,
            closeEditModal,
            'Save Changes'
          )}
        </div>
      </Modal>

      <Modal open={deleteModalOpen} onClose={closeDeleteModal}>
        <div className="dg-card p-5 sm:p-6">
          <div className="dg-admin-head">
            <h2 className="dg-title-sm">Archive Product</h2>
            <span className="dg-badge">Admin Only</span>
          </div>
          <p className="dg-help mt-2 mb-4">
            {deleteTarget
              ? `Archive "${deleteTarget.name}". The record stays in the database and is marked inactive.`
              : 'Archive this product?'}
          </p>
          {formError ? <p className="dg-alert-error">{formError}</p> : null}
          <div className="dg-form-row mt-4 pt-2 border-t border-[var(--color-border)]">
            <button
              type="button"
              className="ui-btn ui-btn-primary ui-btn-md"
              onClick={() => void submitDelete()}
              disabled={isDeleting}
            >
              {isDeleting ? 'Processing...' : 'Archive Product'}
            </button>
            <button
              type="button"
              className="ui-btn ui-btn-secondary ui-btn-md"
              onClick={closeDeleteModal}
              disabled={isDeleting}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </AdminShell>
  );
}

function renderProductForm(
  form: ProductFormState,
  setForm: Dispatch<SetStateAction<ProductFormState>>,
  error: string,
  isSaving: boolean,
  onSubmit: () => Promise<void> | void,
  onCancel: () => void,
  submitLabel: string
) {
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <FieldGroup>
          <FieldLabel htmlFor="product-name">Name</FieldLabel>
          <TextField
            id="product-name"
            value={form.name}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                name: event.target.value,
                slug: prev.slug || toSlug(event.target.value),
              }))
            }
          />
        </FieldGroup>

        <FieldGroup>
          <FieldLabel htmlFor="product-slug">Slug</FieldLabel>
          <TextField
            id="product-slug"
            value={form.slug}
            onChange={(event) => setForm((prev) => ({ ...prev, slug: toSlug(event.target.value) }))}
          />
        </FieldGroup>

        <FieldGroup>
          <FieldLabel htmlFor="product-category">Category</FieldLabel>
          <select
            id="product-category"
            className="dg-select dg-select-md"
            value={form.category}
            onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value as ProductCategory }))}
          >
            {CATEGORY_OPTIONS.map((category) => (
              <option key={category} value={category}>
                {formatCategoryLabel(category)}
              </option>
            ))}
          </select>
        </FieldGroup>

        <FieldGroup>
          <FieldLabel htmlFor="product-material">Material</FieldLabel>
          <TextField
            id="product-material"
            list="product-material-options"
            value={form.material}
            onChange={(event) => setForm((prev) => ({ ...prev, material: event.target.value }))}
            placeholder="Pick or type material"
          />
          <datalist id="product-material-options">
            {MATERIAL_OPTIONS.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </FieldGroup>

        <FieldGroup>
          <FieldLabel htmlFor="product-moq">MOQ</FieldLabel>
          <TextField
            id="product-moq"
            type="number"
            value={form.minOrderQty}
            onChange={(event) => setForm((prev) => ({ ...prev, minOrderQty: event.target.value }))}
          />
        </FieldGroup>

        <FieldGroup>
          <FieldLabel htmlFor="product-lead-time">Lead Time (Days)</FieldLabel>
          <TextField
            id="product-lead-time"
            type="number"
            value={form.leadTimeDays}
            onChange={(event) => setForm((prev) => ({ ...prev, leadTimeDays: event.target.value }))}
          />
        </FieldGroup>

        <FieldGroup className="md:col-span-2">
          <FieldLabel htmlFor="product-short-desc">Short Description</FieldLabel>
          <TextField
            id="product-short-desc"
            value={form.shortDescription}
            onChange={(event) => setForm((prev) => ({ ...prev, shortDescription: event.target.value }))}
          />
        </FieldGroup>

        <FieldGroup className="md:col-span-2">
          <FieldLabel htmlFor="product-description">Description</FieldLabel>
          <TextAreaField
            id="product-description"
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          />
        </FieldGroup>

        <FieldGroup>
          <FieldLabel htmlFor="product-tags">Tags</FieldLabel>
          <div className="dg-checkbox-group mb-2">
            {TAG_OPTIONS.map((tag) => (
              <button
                key={tag}
                type="button"
                className={hasCsvValue(form.tags, tag) ? 'ui-btn ui-btn-primary ui-btn-sm' : 'ui-btn ui-btn-secondary ui-btn-sm'}
                onClick={() => setForm((prev) => ({ ...prev, tags: toggleCsvValue(prev.tags, tag) }))}
              >
                {tag}
              </button>
            ))}
          </div>
          <TextField
            id="product-tags"
            value={form.tags}
            onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
            placeholder="Comma separated tags"
          />
        </FieldGroup>

        <FieldGroup>
          <FieldLabel htmlFor="product-colors">Colors</FieldLabel>
          <div className="dg-checkbox-group mb-2">
            {COLOR_OPTIONS.map((color) => (
              <button
                key={color}
                type="button"
                className={hasCsvValue(form.colors, color) ? 'ui-btn ui-btn-primary ui-btn-sm' : 'ui-btn ui-btn-secondary ui-btn-sm'}
                onClick={() => setForm((prev) => ({ ...prev, colors: toggleCsvValue(prev.colors, color) }))}
              >
                {color}
              </button>
            ))}
          </div>
          <TextField
            id="product-colors"
            value={form.colors}
            onChange={(event) => setForm((prev) => ({ ...prev, colors: event.target.value }))}
            placeholder="Comma separated colors"
          />
        </FieldGroup>

        <FieldGroup>
          <FieldLabel htmlFor="product-sizes">Sizes</FieldLabel>
          <div className="dg-checkbox-group mb-2">
            {SIZE_OPTIONS.map((size) => (
              <button
                key={size}
                type="button"
                className={hasCsvValue(form.sizes, size) ? 'ui-btn ui-btn-primary ui-btn-sm' : 'ui-btn ui-btn-secondary ui-btn-sm'}
                onClick={() => setForm((prev) => ({ ...prev, sizes: toggleCsvValue(prev.sizes, size) }))}
              >
                {size}
              </button>
            ))}
          </div>
          <TextField
            id="product-sizes"
            value={form.sizes}
            onChange={(event) => setForm((prev) => ({ ...prev, sizes: event.target.value }))}
            placeholder="Comma separated sizes"
          />
        </FieldGroup>

        <FieldGroup>
          <FieldLabel htmlFor="product-branding">Branding Options</FieldLabel>
          <div className="dg-checkbox-group mb-2">
            {BRANDING_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={hasCsvValue(form.brandingOptions, option) ? 'ui-btn ui-btn-primary ui-btn-sm' : 'ui-btn ui-btn-secondary ui-btn-sm'}
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    brandingOptions: toggleCsvValue(prev.brandingOptions, option),
                  }))
                }
              >
                {option}
              </button>
            ))}
          </div>
          <TextField
            id="product-branding"
            value={form.brandingOptions}
            onChange={(event) => setForm((prev) => ({ ...prev, brandingOptions: event.target.value }))}
            placeholder="Comma separated branding options"
          />
        </FieldGroup>

        <FieldGroup className="md:col-span-2">
          <FieldLabel htmlFor="product-image">Image URL</FieldLabel>
          <TextField
            id="product-image"
            value={form.image}
            onChange={(event) => setForm((prev) => ({ ...prev, image: event.target.value }))}
          />
        </FieldGroup>

        <FieldGroup className="md:col-span-2">
          <div className="dg-admin-head">
            <FieldLabel>Variants</FieldLabel>
            <button
              type="button"
              className="ui-btn ui-btn-secondary ui-btn-md"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  variants: [
                    ...prev.variants,
                    {
                      sku: '',
                      variantName: '',
                      size: '',
                      color: '',
                      unitPrice: 0,
                      moq: 1,
                      isActive: true,
                    },
                  ],
                }))
              }
            >
              Add Variant
            </button>
          </div>
          {form.variants.length === 0 ? (
            <FieldHint>No variants configured. You can still save the base product.</FieldHint>
          ) : (
            <div className="dg-side-stack">
              {form.variants.map((variant, index) => (
                <div key={`${variant.id || 'new'}-${index}`} className="rounded border border-[var(--color-border)] p-3">
                  <div className="grid gap-3 md:grid-cols-3">
                    <FieldGroup>
                      <FieldLabel>SKU</FieldLabel>
                      <TextField
                        value={variant.sku}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            variants: prev.variants.map((item, i) =>
                              i === index ? { ...item, sku: event.target.value } : item
                            ),
                          }))
                        }
                      />
                    </FieldGroup>
                    <FieldGroup>
                      <FieldLabel>Variant Name</FieldLabel>
                      <TextField
                        value={variant.variantName}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            variants: prev.variants.map((item, i) =>
                              i === index ? { ...item, variantName: event.target.value } : item
                            ),
                          }))
                        }
                      />
                    </FieldGroup>
                    <FieldGroup>
                      <FieldLabel>Unit Price</FieldLabel>
                      <TextField
                        type="number"
                        step="0.01"
                        value={String(variant.unitPrice)}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            variants: prev.variants.map((item, i) =>
                              i === index ? { ...item, unitPrice: Number(event.target.value || 0) } : item
                            ),
                          }))
                        }
                      />
                    </FieldGroup>
                    <FieldGroup>
                      <FieldLabel>MOQ</FieldLabel>
                      <TextField
                        type="number"
                        value={String(variant.moq)}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            variants: prev.variants.map((item, i) =>
                              i === index ? { ...item, moq: Number(event.target.value || 1) } : item
                            ),
                          }))
                        }
                      />
                    </FieldGroup>
                    <FieldGroup>
                      <FieldLabel>Size</FieldLabel>
                      <TextField
                        list={`variant-size-options-${index}`}
                        value={String(variant.size || '')}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            variants: prev.variants.map((item, i) =>
                              i === index ? { ...item, size: event.target.value } : item
                            ),
                          }))
                        }
                      />
                      <datalist id={`variant-size-options-${index}`}>
                        {SIZE_OPTIONS.map((size) => (
                          <option key={size} value={size} />
                        ))}
                      </datalist>
                    </FieldGroup>
                    <FieldGroup>
                      <FieldLabel>Color</FieldLabel>
                      <TextField
                        list={`variant-color-options-${index}`}
                        value={String(variant.color || '')}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            variants: prev.variants.map((item, i) =>
                              i === index ? { ...item, color: event.target.value } : item
                            ),
                          }))
                        }
                      />
                      <datalist id={`variant-color-options-${index}`}>
                        {COLOR_OPTIONS.map((color) => (
                          <option key={color} value={color} />
                        ))}
                      </datalist>
                    </FieldGroup>
                  </div>
                  <div className="dg-form-row mt-2">
                    <label className="dg-help">
                      <input
                        type="checkbox"
                        checked={variant.isActive}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            variants: prev.variants.map((item, i) =>
                              i === index ? { ...item, isActive: event.target.checked } : item
                            ),
                          }))
                        }
                      />{' '}
                      Active
                    </label>
                    <button
                      type="button"
                      className="ui-btn ui-btn-secondary ui-btn-md"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          variants: prev.variants.filter((_, i) => i !== index),
                        }))
                      }
                    >
                      Remove Variant
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </FieldGroup>
      </div>

      <div className="dg-form-row mt-2">
        <label className="dg-help">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
          />{' '}
          Active
        </label>
        <label className="dg-help">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(event) => setForm((prev) => ({ ...prev, featured: event.target.checked }))}
          />{' '}
          Featured
        </label>
      </div>

      {error ? <p className="dg-alert-error">{error}</p> : null}

      <div className="dg-form-row mt-4 pt-2 border-t border-[var(--color-border)]">
        <button
          type="button"
          className="ui-btn ui-btn-primary ui-btn-md"
          onClick={() => void onSubmit()}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : submitLabel}
        </button>
        <button type="button" className="ui-btn ui-btn-secondary ui-btn-md" onClick={onCancel} disabled={isSaving}>
          Cancel
        </button>
      </div>
    </>
  );
}
