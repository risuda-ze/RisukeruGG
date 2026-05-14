/* ダッシュボード用コラボ打診リストコンポーネント */

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';

export interface CollabRequestItem {
  id: string;
  /** 相手チャンネル名 */
  name: string;
  /** イニシャル（アバター用） */
  initials: string;
  /** 詳細テキスト 例: "Apex コラボ希望 — 5/18 20:00〜" */
  detail: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  onOk?: () => void;
  onNg?: () => void;
}

export interface CollabRequestsProps {
  items: CollabRequestItem[];
}

export function CollabRequests({ items }: CollabRequestsProps) {
  if (items.length === 0) {
    return (
      <p className="text-[12px] text-muted py-4 text-center">コラボ打診はありません</p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const isPending = item.status === 'pending';
        return (
          <li
            key={item.id}
            className={`flex items-center gap-3 bg-surface border border-border rounded-[10px] p-3 transition-opacity ${
              !isPending ? 'opacity-60' : ''
            }`}
          >
            <Avatar
              initials={item.initials}
              bgClass="bg-amber-d/30"
              textClass="text-amber-l"
              size="md"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-text truncate">{item.name}</p>
              <p className="text-[11px] text-muted truncate">{item.detail}</p>
            </div>
            {isPending ? (
              <div className="flex gap-1.5 shrink-0">
                <Button variant="primary" size="sm" onClick={item.onOk} aria-label="OK">
                  OK
                </Button>
                <Button variant="danger" size="sm" onClick={item.onNg} aria-label="NG">
                  NG
                </Button>
              </div>
            ) : (
              <span className="text-[11px] text-muted shrink-0">
                {item.status === 'confirmed' ? '確定' : 'キャンセル'}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
