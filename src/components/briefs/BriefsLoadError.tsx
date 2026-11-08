import { Card } from '@/components/ui/Card';

/** タスク管理 v2 の購読エラー表示。ストアの error をそのまま出す */
export function BriefsLoadError({ message }: { message: string }) {
  return (
    <Card className="text-center py-10">
      <p className="text-sm" style={{ color: 'var(--danger)' }}>
        {message}
      </p>
    </Card>
  );
}
