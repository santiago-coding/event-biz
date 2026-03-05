"use client";

import { useEffect, useState } from "react";

interface Settings {
  id: string;
  businessName: string;
  legalName: string;
  owner: string;
  email: string;
  phone: string;
  address: string;
  ein: string;
  website: string;
  boothSize: string;
  boothType: string;
  productCategory: string;
  productDescription: string;
  targetDemographic: string;
  crewSize: number;
  dailySalesTarget: number;
  expenseBudget: number;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  hint,
}: {
  label: string;
  value: string | number;
  onChange: (val: string) => void;
  type?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setSaved(false);

    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const update = (field: keyof Settings, value: string) => {
    if (!settings) return;
    const numFields = ["crewSize", "dailySalesTarget", "expenseBudget"];
    setSettings({
      ...settings,
      [field]: numFields.includes(field) ? parseInt(value) || 0 : value,
    });
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;
  if (!settings) return <div className="text-center py-12 text-red-500">Failed to load settings</div>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-gray-500 mt-1">Company profile — this data feeds the auto-filler</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : saved ? "✓ Saved!" : "Save Changes"}
        </button>
      </div>

      <div className="space-y-8">
        {/* Business info */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Business Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Business Name (DBA)" value={settings.businessName} onChange={(v) => update("businessName", v)} />
            <Field label="Legal Name" value={settings.legalName} onChange={(v) => update("legalName", v)} />
            <Field label="Owner / Contact" value={settings.owner} onChange={(v) => update("owner", v)} />
            <Field label="EIN / Tax ID" value={settings.ein} onChange={(v) => update("ein", v)} />
            <Field label="Website" value={settings.website} onChange={(v) => update("website", v)} />
            <Field label="Product Category" value={settings.productCategory} onChange={(v) => update("productCategory", v)} />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Description</label>
            <textarea
              value={settings.productDescription}
              onChange={(e) => update("productDescription", e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">This is what gets filled in &quot;describe your products&quot; fields</p>
          </div>
        </div>

        {/* Contact info */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Contact Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email" value={settings.email} onChange={(v) => update("email", v)} type="email" />
            <Field label="Phone" value={settings.phone} onChange={(v) => update("phone", v)} type="tel" />
            <div className="col-span-2">
              <Field label="Address" value={settings.address} onChange={(v) => update("address", v)} hint="Street, City, State ZIP — parsed for individual form fields" />
            </div>
          </div>
        </div>

        {/* Booth preferences */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Booth Preferences</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Booth Size" value={settings.boothSize} onChange={(v) => update("boothSize", v)} hint='e.g. "10x10", "10x20"' />
            <Field label="Booth Type" value={settings.boothType} onChange={(v) => update("boothType", v)} hint='"indoor", "outdoor", or "both"' />
            <Field label="Target Demographic" value={settings.targetDemographic} onChange={(v) => update("targetDemographic", v)} />
          </div>
        </div>

        {/* Financial */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Financial Targets</h2>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Crew Size" value={settings.crewSize} onChange={(v) => update("crewSize", v)} type="number" />
            <Field label="Daily Sales Target ($)" value={settings.dailySalesTarget} onChange={(v) => update("dailySalesTarget", v)} type="number" />
            <Field label="Expense Budget per Event ($)" value={settings.expenseBudget} onChange={(v) => update("expenseBudget", v)} type="number" />
          </div>
        </div>
      </div>
    </div>
  );
}
