"use client";

import { Bell, Camera, Check, KeyRound, Loader2, Mail, MapPin, Phone, Save, UserRound } from "lucide-react";
import Image from "next/image";
import type { ChangeEvent } from "react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type Settings = {
  email_on_message: boolean;
  email_on_update: boolean;
  email_on_complete: boolean;
  sms_on_message: boolean;
  sms_on_update: boolean;
  timezone: string;
  two_factor_enabled?: boolean;
};

type Profile = {
  id: string;
  legal_name: string;
  email: string;
  phone?: string;
  business_name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  avatar_url?: string | null;
  role: string;
  created_at?: string;
  settings: Settings;
};

const EMPTY_SETTINGS: Settings = {
  email_on_message: true,
  email_on_update: true,
  email_on_complete: true,
  sms_on_message: true,
  sms_on_update: false,
  timezone: "America/New_York",
};

export default function ProfilePanel() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<Partial<Profile> & { settings?: Settings }>({ settings: EMPTY_SETTINGS });
  const [tab, setTab] = useState<"personal" | "notifications" | "account">("personal");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/portal/profile", { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Profile could not be loaded");
        return data as Profile;
      })
      .then((data) => {
        const normalized = { ...data, settings: { ...EMPTY_SETTINGS, ...(data.settings || {}) } };
        setProfile(normalized);
        setForm(normalized);
      })
      .catch((err) => setError(err.message || "Profile could not be loaded"));
  }, []);

  function updateField(key: keyof Profile, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateSetting(key: keyof Settings, value: boolean | string) {
    setForm((current) => ({
      ...current,
      settings: { ...EMPTY_SETTINGS, ...(current.settings || {}), [key]: value },
    }));
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarError("");
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setAvatarError("Avatar must be a JPG, PNG, WebP, or GIF image.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Avatar must be 5MB or smaller.");
      event.target.value = "";
      return;
    }

    setUploadingAvatar(true);
    try {
      const body = new FormData();
      body.append("avatar", file);
      const res = await fetch("/api/portal/profile/avatar", {
        method: "POST",
        credentials: "include",
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Avatar upload failed");
      const avatarUrl = data.avatarUrl || null;
      setProfile((current) => current ? { ...current, avatar_url: avatarUrl } : current);
      setForm((current) => ({ ...current, avatar_url: avatarUrl }));
    } catch (err: any) {
      setAvatarError(err.message || "Avatar upload failed");
    } finally {
      setUploadingAvatar(false);
      event.target.value = "";
    }
  }

  async function saveProfile() {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch("/api/portal/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Profile could not be saved");
      setProfile(form as Profile);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err.message || "Profile could not be saved");
    } finally {
      setSaving(false);
    }
  }

  if (!profile && !error) {
    return (
      <div className="space-y-4">
        <div className="h-20 rounded-xl bg-slate-100 animate-pulse" />
        <div className="h-72 rounded-xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <section className="bg-white border border-border rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative w-16 h-16 rounded-xl bg-[#0B4DA2] text-white grid place-items-center overflow-hidden"
              aria-label="Change profile photo"
              title="Change profile photo"
              disabled={uploadingAvatar}
            >
              {profile?.avatar_url ? (
                <Image src={profile.avatar_url} alt="Profile photo" fill sizes="64px" className="object-cover" unoptimized />
              ) : (
                <span className="text-2xl font-black">{initials(profile?.legal_name || profile?.email)}</span>
              )}
              <span className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center">
                {uploadingAvatar ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarChange}
              disabled={uploadingAvatar}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black text-ink">My Profile</h1>
            <p className="text-sm text-muted truncate">{profile?.email || "Manage your account information and preferences."}</p>
            {avatarError && <p className="mt-1 text-xs font-bold text-red-700">{avatarError}</p>}
            {uploadingAvatar && <p className="mt-1 text-xs font-bold text-muted">Uploading photo...</p>}
          </div>
        </div>
      </section>

      <div className="bg-white border border-border rounded-xl p-1 flex gap-1">
        {[
          { id: "personal", label: "Personal", icon: UserRound },
          { id: "notifications", label: "Notifications", icon: Bell },
          { id: "account", label: "Account", icon: KeyRound },
        ].map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id as typeof tab)}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold flex items-center justify-center gap-2 ${active ? "bg-[#0B4DA2] text-white" : "text-muted hover:bg-slate-50"}`}
            >
              <Icon size={15} />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "personal" && (
        <section className="bg-white border border-border rounded-xl p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Legal name" value={form.legal_name || ""} onChange={(value) => updateField("legal_name", value)} />
            <Field label="Business name" value={form.business_name || ""} onChange={(value) => updateField("business_name", value)} />
            <Field label="Phone" value={form.phone || ""} onChange={(value) => updateField("phone", value)} icon={<Phone size={16} />} />
            <Field label="Email" value={form.email || ""} readOnly icon={<Mail size={16} />} />
            <Field label="Address" value={form.address || ""} onChange={(value) => updateField("address", value)} icon={<MapPin size={16} />} />
            <div className="grid min-w-0 grid-cols-1 gap-3 min-[420px]:grid-cols-3">
              <Field label="City" value={form.city || ""} onChange={(value) => updateField("city", value)} />
              <Field label="State" value={form.state || ""} onChange={(value) => updateField("state", value)} />
              <Field label="ZIP" value={form.zip || ""} onChange={(value) => updateField("zip", value)} />
            </div>
          </div>
        </section>
      )}

      {tab === "notifications" && (
        <section className="bg-white border border-border rounded-xl p-5 space-y-3">
          <Toggle label="Email me when my specialist sends a message" checked={form.settings?.email_on_message !== false} onChange={(value) => updateSetting("email_on_message", value)} />
          <Toggle label="Text me when my specialist sends a message" checked={form.settings?.sms_on_message !== false} onChange={(value) => updateSetting("sms_on_message", value)} />
          <Toggle label="Email me on case updates" checked={form.settings?.email_on_update !== false} onChange={(value) => updateSetting("email_on_update", value)} />
          <Toggle label="Text me on case updates" checked={form.settings?.sms_on_update === true} onChange={(value) => updateSetting("sms_on_update", value)} />
          <Toggle label="Email me when work is complete" checked={form.settings?.email_on_complete !== false} onChange={(value) => updateSetting("email_on_complete", value)} />
          <Field label="Timezone" value={form.settings?.timezone || "America/New_York"} onChange={(value) => updateSetting("timezone", value)} />
        </section>
      )}

      {tab === "account" && (
        <section className="bg-white border border-border rounded-xl p-5 space-y-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <Toggle
              label="Require two-factor verification for this account"
              checked={form.settings?.two_factor_enabled === true}
              onChange={(value) => updateSetting("two_factor_enabled", value)}
            />
            <p className="mt-3 text-xs leading-6 text-muted">
              When enabled, sign-in requires a 6-digit verification code. The code is sent by text message to your phone number on file, or by email if no phone number is saved.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <Info label="Role" value={profile?.role || "client"} />
            <Info label="Member since" value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "Not available"} />
            <Info label="Account ID" value={profile?.id || ""} mono />
            <Info label="Two-factor status" value={form.settings?.two_factor_enabled ? "Enabled" : "Not enabled"} />
          </div>
          <a href="/reset-password" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-bold text-ink hover:bg-slate-50">
            <KeyRound size={16} />
            Change password
          </a>
        </section>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={saveProfile}
          disabled={saving || !profile}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0B4DA2] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save changes
        </button>
        {saved && <span className="inline-flex items-center gap-1 text-sm font-bold text-green-700"><Check size={16} /> Saved</span>}
        {error && <span className="text-sm font-bold text-red-700">{error}</span>}
      </div>
    </div>
  );
}

function initials(value?: string | null) {
  return (value || "?")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Field({ label, value, onChange, readOnly, icon }: { label: string; value: string; onChange?: (value: string) => void; readOnly?: boolean; icon?: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="block text-xs font-bold text-muted mb-1">{label}</span>
      <span className="relative block min-w-0">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">{icon}</span>}
        <input
          value={value}
          readOnly={readOnly}
          onChange={(event) => onChange?.(event.target.value)}
          className={`min-w-0 w-full rounded-lg border border-border px-3 py-2 text-sm text-ink ${icon ? "pl-9" : ""} ${readOnly ? "bg-slate-50 text-muted" : "bg-white"}`}
          style={{ fontSize: 16 }}
        />
      </span>
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
      <span className="text-sm font-bold text-ink">{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5" />
    </label>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="text-xs font-bold text-muted">{label}</div>
      <div className={`mt-1 text-ink font-bold break-words ${mono ? "font-mono text-xs" : ""}`}>{value}</div>
    </div>
  );
}
