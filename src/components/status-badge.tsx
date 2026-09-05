import type { InvoiceRequestStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";

const statusConfig: Record<
  InvoiceRequestStatus,
  { label: string; className: string }
> = {
  PENDING_REVIEW: {
    label: "در انتظار بررسی",
    className: "bg-amber-100 text-amber-800",
  },
  APPROVED: {
    label: "تأییدشده، منتظر پرداخت",
    className: "bg-blue-100 text-blue-800",
  },
  REJECTED: { label: "ردشده", className: "bg-red-100 text-red-800" },
  PAID: { label: "پرداخت‌شده", className: "bg-emerald-100 text-emerald-800" },
};

export function StatusBadge({ status }: { status: InvoiceRequestStatus }) {
  const config = statusConfig[status];
  return <Badge className={config.className}>{config.label}</Badge>;
}
