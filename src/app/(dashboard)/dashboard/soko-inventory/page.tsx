"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  ImagePlus,
  PackagePlus,
  Pause,
  Pencil,
  Plus,
  RefreshCw,
  Store,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  createSokoProduct,
  mySokoProducts,
  mySokoStores,
  pauseSokoProduct,
  ProductPayload,
  publishSokoProduct,
  removeSokoProduct,
  SokoProduct,
  SokoStore,
  SokoVariation,
  updateSokoProduct,
  uploadSokoProductImages,
} from "@/services/soko";

const blankVariation = (): SokoVariation => ({
  name: "Option",
  value: "",
  priceAdjustment: 0,
  stockQuantity: 0,
});
const blankProduct = (): ProductPayload => ({
  storeId: 0,
  name: "",
  description: "",
  category: "Groceries",
  unit: "item",
  price: 0,
  stockQuantity: 0,
  variations: [],
});
const errorText = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { description?: string } } }).response?.data
    ?.description ?? fallback;
const money = (value: number, currency = "KES") =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value || 0);
const parseVariations = (value?: string): SokoVariation[] => {
  try {
    const rows = JSON.parse(value ?? "[]");
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
};

export default function SokoInventoryPage() {
  const [stores, setStores] = useState<SokoStore[]>([]),
    [products, setProducts] = useState<SokoProduct[]>([]),
    [storeId, setStoreId] = useState(0);
  const [form, setForm] = useState<ProductPayload>(blankProduct()),
    [editingId, setEditingId] = useState<number>(),
    [images, setImages] = useState<File[]>([]),
    [busy, setBusy] = useState(false);
  const selectedStore = stores.find((store) => store.id === storeId);
  const variations = form.variations ?? [];
  const totalStock = useMemo(
    () =>
      variations.length
        ? variations.reduce(
            (sum, row) => sum + (Number(row.stockQuantity) || 0),
            0,
          )
        : form.stockQuantity,
    [form.stockQuantity, variations],
  );
  const loadProducts = useCallback(async (id: number) => {
    if (!id) {
      setProducts([]);
      return;
    }
    const response = await mySokoProducts(id);
    setProducts(response.data?.data ?? []);
  }, []);
  const load = useCallback(async () => {
    try {
      const response = await mySokoStores();
      const rows: SokoStore[] = response.data?.data ?? [];
      setStores(rows);
      const id = storeId || rows[0]?.id || 0;
      setStoreId(id);
      setForm((current) => ({ ...current, storeId: id }));
      await loadProducts(id);
    } catch (e) {
      toast.error(errorText(e, "Your Soko inventory could not be loaded."));
    }
  }, [loadProducts, storeId]);
  useEffect(() => {
    void load();
  }, [load]);
  const reset = () => {
    setEditingId(undefined);
    setImages([]);
    setForm({ ...blankProduct(), storeId });
  };
  const updateVariation = (index: number, changes: Partial<SokoVariation>) =>
    setForm((current) => ({
      ...current,
      variations: (current.variations ?? []).map((row, i) =>
        i === index ? { ...row, ...changes } : row,
      ),
    }));
  const save = async () => {
    if (
      !form.name.trim() ||
      !form.category.trim() ||
      !form.unit.trim() ||
      form.price <= 0
    )
      return toast.error(
        "Enter the product name, category, selling unit and a valid base price.",
      );
    if (
      variations.some(
        (row) => !row.name.trim() || !row.value.trim() || row.stockQuantity < 0,
      )
    )
      return toast.error(
        "Complete every variation and use a stock value of zero or more.",
      );
    if (!editingId && !images.length)
      return toast.error(
        "Add at least one product image before saving the draft.",
      );
    setBusy(true);
    try {
      const payload = { ...form, storeId, stockQuantity: totalStock };
      const response = editingId
        ? await updateSokoProduct(editingId, payload)
        : await createSokoProduct(payload);
      const saved: SokoProduct = response.data?.data?.[0];
      if (!saved?.id) throw new Error("Missing product id");
      if (images.length) await uploadSokoProductImages(saved.id, images);
      toast.success(editingId ? "Product updated." : "Product draft created.");
      reset();
      await loadProducts(storeId);
    } catch (e) {
      toast.error(errorText(e, "The product could not be saved."));
    } finally {
      setBusy(false);
    }
  };
  const edit = (product: SokoProduct) => {
    setEditingId(product.id);
    setImages([]);
    setForm({
      storeId: product.storeId,
      name: product.name,
      description: product.description ?? "",
      category: product.category,
      unit: product.unit,
      price: product.price,
      stockQuantity: product.stockQuantity,
      imageUrl: product.imageUrl,
      variations: parseVariations(product.variationsJson),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const action = async (
    product: SokoProduct,
    kind: "publish" | "pause" | "remove",
  ) => {
    if (
      kind === "remove" &&
      !confirm(
        `Remove ${product.name}? This is allowed only when it is not part of an open order.`,
      )
    )
      return;
    setBusy(true);
    try {
      if (kind === "publish") await publishSokoProduct(product.id);
      else if (kind === "pause") await pauseSokoProduct(product.id);
      else await removeSokoProduct(product.id);
      toast.success(
        kind === "remove"
          ? "Product removed."
          : kind === "pause"
            ? "Listing paused."
            : "Listing published.",
      );
      await loadProducts(storeId);
    } catch (e) {
      toast.error(errorText(e, "The listing could not be updated."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 px-3 py-6">
      <header className="rounded-3xl bg-[#07143D] p-6 text-white">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-orange-300">
          Soko merchant workspace
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Product inventory</h1>
            <p className="mt-2 text-white/70">
              Create products, control variations and stock, then publish,
              pause, edit or remove each listing.
            </p>
          </div>
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-semibold text-[#07143D]"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </header>
      {!stores.length ? (
        <section className="rounded-2xl border bg-white p-10 text-center">
          <Store className="mx-auto h-10 w-10 text-orange-400" />
          <h2 className="mt-3 text-xl font-bold">
            Create your Soko shop first
          </h2>
          <p className="mt-2 text-gray-500">
            Open Soko, choose Merchant workspace and create a shop with a
            receiving account.
          </p>
          <a
            href="/dashboard/soko"
            className="mt-4 inline-block rounded-xl bg-[#FF4B1F] px-5 py-3 font-semibold text-white"
          >
            Open Soko setup
          </a>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">
                  {editingId ? "Edit product" : "Add a product"}
                </h2>
                <p className="text-sm text-gray-500">
                  Variations have their own price adjustment and stock. Total
                  stock is calculated automatically.
                </p>
              </div>
              <select
                value={storeId}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setStoreId(id);
                  setEditingId(undefined);
                  setImages([]);
                  setForm({ ...blankProduct(), storeId: id });
                  void loadProducts(id);
                }}
                className="rounded-xl border p-3"
              >
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name} · {store.status}
                  </option>
                ))}
              </select>
            </div>
            {selectedStore?.status !== "PUBLISHED" && (
              <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                This shop must be approved and published before its products can
                appear to buyers.
              </p>
            )}
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Product name"
                className="rounded-xl border p-3"
              />
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Category"
                className="rounded-xl border p-3"
              />
              <input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="Selling unit, e.g. item or kg"
                className="rounded-xl border p-3"
              />
              <label className="rounded-xl border p-3 text-sm">
                Base price ({selectedStore?.currency ?? "KES"})
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.price || ""}
                  onChange={(e) =>
                    setForm({ ...form, price: Number(e.target.value) })
                  }
                  className="mt-1 w-full outline-none"
                />
              </label>
              <textarea
                value={form.description ?? ""}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Description"
                className="rounded-xl border p-3 md:col-span-2"
              />
              {!variations.length && (
                <label className="rounded-xl border p-3 text-sm">
                  Stock quantity
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.stockQuantity}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        stockQuantity: Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full outline-none"
                  />
                </label>
              )}
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm">
                <ImagePlus className="h-4 w-4" />
                {editingId
                  ? "Replace product images (optional)"
                  : "Add product images"}
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) =>
                    setImages(Array.from(e.target.files ?? []).slice(0, 5))
                  }
                  className="sr-only"
                />
              </label>
            </div>
            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold">Variations</h3>
                  <p className="text-sm text-gray-500">
                    Optional. Add choices such as Size: Large or Colour: Blue.
                  </p>
                </div>
                <button
                  onClick={() =>
                    setForm({
                      ...form,
                      variations: [...variations, blankVariation()],
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold"
                >
                  <Plus className="h-4 w-4" />
                  Add variation
                </button>
              </div>
              <div className="mt-3 space-y-3">
                {variations.map((row, index) => (
                  <div
                    key={`${index}-${row.id ?? "new"}`}
                    className="grid gap-2 rounded-xl border bg-white p-3 md:grid-cols-[1fr_1fr_150px_120px_auto]"
                  >
                    <input
                      value={row.name}
                      onChange={(e) =>
                        updateVariation(index, { name: e.target.value })
                      }
                      placeholder="Option name"
                      className="rounded-lg border p-2"
                    />
                    <input
                      value={row.value}
                      onChange={(e) =>
                        updateVariation(index, { value: e.target.value })
                      }
                      placeholder="Option value"
                      className="rounded-lg border p-2"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.priceAdjustment ?? 0}
                      onChange={(e) =>
                        updateVariation(index, {
                          priceAdjustment: Number(e.target.value),
                        })
                      }
                      aria-label="Price adjustment"
                      className="rounded-lg border p-2"
                    />
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={row.stockQuantity}
                      onChange={(e) =>
                        updateVariation(index, {
                          stockQuantity: Number(e.target.value),
                        })
                      }
                      aria-label="Variation stock"
                      className="rounded-lg border p-2"
                    />
                    <button
                      onClick={() =>
                        setForm({
                          ...form,
                          variations: variations.filter((_, i) => i !== index),
                        })
                      }
                      aria-label="Delete variation"
                      className="rounded-lg p-2 text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              {variations.length > 0 && (
                <p className="mt-3 text-sm font-semibold">
                  Total available stock: {totalStock}
                </p>
              )}
            </div>
            <div className="mt-5 flex gap-3">
              <button
                disabled={busy}
                onClick={save}
                className="inline-flex items-center gap-2 rounded-xl bg-[#020B2D] px-5 py-3 font-semibold text-white disabled:opacity-50"
              >
                <PackagePlus className="h-4 w-4" />
                {editingId ? "Save changes" : "Save draft"}
              </button>
              {editingId && (
                <button onClick={reset} className="rounded-xl border px-5 py-3">
                  Cancel
                </button>
              )}
            </div>
          </section>
          <section className="rounded-2xl border bg-white p-5">
            <h2 className="text-xl font-bold">Listings</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {products.map((product) => {
                const rows = parseVariations(product.variationsJson);
                return (
                  <article key={product.id} className="rounded-2xl border p-4">
                    <div className="flex justify-between gap-3">
                      <div>
                        <h3 className="font-bold">{product.name}</h3>
                        <p className="text-sm text-gray-500">
                          {product.category} ·{" "}
                          {money(product.price, product.currency)} base price
                        </p>
                      </div>
                      <span className="h-fit rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">
                        {product.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="mt-3 text-sm">
                      {product.stockQuantity} {product.unit} available
                    </p>
                    {rows.length > 0 && (
                      <div className="mt-3 space-y-1 text-xs text-gray-600">
                        {rows.map((row) => (
                          <p key={row.id ?? `${row.name}-${row.value}`}>
                            {row.name}: {row.value} · {row.stockQuantity} · +
                            {money(row.priceAdjustment ?? 0, product.currency)}
                          </p>
                        ))}
                      </div>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => edit(product)}
                        className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </button>
                      {["DRAFT", "PAUSED", "OUT_OF_STOCK", "REJECTED"].includes(
                        product.status,
                      ) && (
                        <button
                          disabled={busy || product.stockQuantity < 1}
                          onClick={() => action(product, "publish")}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
                        >
                          <Archive className="h-4 w-4" />
                          Publish
                        </button>
                      )}
                      {product.status === "PUBLISHED" && (
                        <button
                          disabled={busy}
                          onClick={() => action(product, "pause")}
                          className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800"
                        >
                          <Pause className="h-4 w-4" />
                          Pause
                        </button>
                      )}
                      <button
                        disabled={busy}
                        onClick={() => action(product, "remove")}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    </div>
                  </article>
                );
              })}
              {!products.length && (
                <p className="py-10 text-center text-gray-500 md:col-span-2">
                  No products have been created for this shop.
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
