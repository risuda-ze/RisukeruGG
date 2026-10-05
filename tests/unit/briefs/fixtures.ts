import type { Playbook, Step } from '@/types/briefs';

/** テスト用の進め方: 構成確認 → 編集 → サムネ（編集に依存）→ 告知（任意） */
export function samplePlaybook(): Playbook {
  return {
    id: 'pb_1',
    name: 'YouTube 動画',
    version: 3,
    origin: 'manual',
    headerFields: [
      { key: 'summary', label: '概要', type: 'text', required: false, ownerRoleLabel: null },
    ],
    steps: [
      {
        key: 'outline',
        title: '構成確認',
        roleLabel: '出演者',
        defaultAssigneeId: 'u_risu',
        leadDays: 7,
        dependsOn: [],
        requiredFields: [],
        reminderDaysBefore: 1,
        optional: false,
      },
      {
        key: 'edit',
        title: '編集',
        roleLabel: '編集',
        defaultAssigneeId: 'u_sato',
        leadDays: 3,
        dependsOn: ['outline'],
        requiredFields: [
          { key: 'material_url', label: '素材の場所', type: 'url', required: true, ownerRoleLabel: '出演者' },
        ],
        reminderDaysBefore: 2,
        optional: false,
      },
      {
        key: 'thumb',
        title: 'サムネ作成',
        roleLabel: 'サムネ',
        defaultAssigneeId: null,
        leadDays: 2,
        dependsOn: ['edit'],
        requiredFields: [
          { key: 'copy', label: '文言案', type: 'text', required: true, ownerRoleLabel: '出演者' },
        ],
        reminderDaysBefore: 1,
        optional: false,
      },
      {
        key: 'announce',
        title: '告知',
        roleLabel: '運営',
        defaultAssigneeId: null,
        leadDays: 0,
        dependsOn: ['thumb'],
        requiredFields: [],
        reminderDaysBefore: 0,
        optional: true,
      },
    ],
    createdAt: new Date('2026-09-01'),
    updatedAt: new Date('2026-09-01'),
  };
}

/** 任意項目だけ上書きできる Step ファクトリ */
export function makeStep(overrides: Partial<Step> & { id: string; key: string }): Step {
  return {
    briefId: 'b_1',
    teamId: 't_1',
    title: overrides.key,
    order: 0,
    status: 'waiting',
    assigneeId: null,
    dueDate: null,
    dueDateOverridden: false,
    leadDays: 0,
    dependsOn: [],
    requiredFields: [],
    fields: {},
    reminderDaysBefore: 1,
    optional: false,
    completedAt: null,
    completedBy: null,
    discordMessageId: null,
    createdAt: new Date('2026-09-01'),
    updatedAt: new Date('2026-09-01'),
    ...overrides,
  };
}
