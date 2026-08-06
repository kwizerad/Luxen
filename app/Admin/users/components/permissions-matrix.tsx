"use client";

import { PERMISSION_SECTIONS, type AdminPermissions, type PermissionAccess } from "@/lib/permissions";
import { useLanguage } from "@/lib/language-context";
import { Check, Minus } from "lucide-react";

interface PermissionsMatrixProps {
  permissions: AdminPermissions;
  onChange: (permissions: AdminPermissions) => void;
  disabled?: boolean;
}

export function PermissionsMatrix({ permissions, onChange, disabled }: PermissionsMatrixProps) {
  const { t } = useLanguage();

  const setAccess = (section: keyof AdminPermissions, access: PermissionAccess) => {
    if (disabled) return;
    onChange({ ...permissions, [section]: access });
  };

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 sm:gap-4 px-3 py-2 text-xs font-medium text-[var(--admin-muted)] border-b border-[var(--admin-border)]">
        <span>{t("feature")}</span>
        <span className="w-16 text-center">{t("permNone")}</span>
        <span className="w-16 text-center">{t("permReadOnly")}</span>
        <span className="w-16 text-center">{t("permReadWrite")}</span>
      </div>

      {/* Rows */}
      {PERMISSION_SECTIONS.map(({ key, labelKey }) => {
        const current = permissions[key];
        return (
          <div
            key={key}
            className="grid grid-cols-[1fr_auto_auto_auto] gap-2 sm:gap-4 px-3 py-2.5 items-center rounded-lg hover:bg-[var(--admin-hover-bg)] transition-colors"
          >
            <span className="text-sm font-medium text-[var(--admin-text)]">
              {t(labelKey) || key}
            </span>
            {(["none", "read_only", "read_write"] as PermissionAccess[]).map((access) => (
              <button
                key={access}
                type="button"
                disabled={disabled}
                onClick={() => setAccess(key, access)}
                className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto transition-all ${
                  current === access
                    ? access === "none"
                      ? "bg-red-500/20 text-red-400 ring-2 ring-red-500/40"
                      : access === "read_only"
                      ? "bg-yellow-500/20 text-yellow-400 ring-2 ring-yellow-500/40"
                      : "bg-green-500/20 text-green-400 ring-2 ring-green-500/40"
                    : "bg-transparent text-transparent hover:bg-[var(--admin-input-bg)]"
                } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                title={t(`perm${access.charAt(0).toUpperCase() + access.slice(1)}`) || access}
              >
                {access === "none" ? <Minus className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}
