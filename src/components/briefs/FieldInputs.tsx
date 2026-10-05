'use client';

import { Input } from '@/components/ui/Input';
import { DateInput } from '@/components/ui/DateInput';
import { Dropdown } from '@/components/ui/Dropdown';
import { fromDateInputValue, toDateInputValue } from '@/lib/briefs/format';
import type { FieldDef } from '@/types/briefs';

interface FieldInputsProps {
  defs: FieldDef[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  disabled?: boolean;
}

/**
 * 項目定義（FieldDef）に従って入力欄を並べる。
 * 見出し項目と工程固有の項目の両方で使う。値は key ごとに部分更新する。
 */
export function FieldInputs({ defs, values, onChange, disabled }: FieldInputsProps) {
  if (defs.length === 0) return null;
  return (
    <div className="space-y-3">
      {defs.map((def) => {
        const label = def.required ? `${def.label} *` : def.label;
        const hint = def.ownerRoleLabel ? `入力: ${def.ownerRoleLabel}` : undefined;
        const raw = values[def.key];
        switch (def.type) {
          case 'date': {
            const asDate = raw instanceof Date ? raw : typeof raw === 'string' ? fromDateInputValue(raw) : null;
            return (
              <DateInput
                key={def.key}
                label={label}
                value={toDateInputValue(asDate)}
                onChange={(v) => onChange(def.key, v || null)}
                hint={hint}
              />
            );
          }
          case 'select':
            return (
              <div key={def.key} className="flex flex-col gap-1.5">
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {label}
                </span>
                <Dropdown
                  options={[{ value: '', label: '未選択' }, ...(def.options ?? []).map((o) => ({ value: o, label: o }))]}
                  value={typeof raw === 'string' ? raw : ''}
                  onChange={(v) => onChange(def.key, v || null)}
                  size="sm"
                />
                {hint && <span className="text-[11px] text-muted">{hint}</span>}
              </div>
            );
          case 'number':
            return (
              <Input
                key={def.key}
                label={label}
                type="number"
                inputMode="numeric"
                value={raw === null || raw === undefined ? '' : String(raw)}
                onChange={(e) => onChange(def.key, e.target.value === '' ? null : Number(e.target.value))}
                hint={hint}
                disabled={disabled}
              />
            );
          case 'url':
            return (
              <Input
                key={def.key}
                label={label}
                type="url"
                placeholder="https://"
                value={typeof raw === 'string' ? raw : ''}
                onChange={(e) => onChange(def.key, e.target.value)}
                hint={hint}
                disabled={disabled}
              />
            );
          default:
            return (
              <Input
                key={def.key}
                label={label}
                value={typeof raw === 'string' ? raw : ''}
                onChange={(e) => onChange(def.key, e.target.value)}
                hint={hint}
                disabled={disabled}
                maxLength={500}
              />
            );
        }
      })}
    </div>
  );
}
