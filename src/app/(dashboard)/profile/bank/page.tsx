import { BankForm } from "@/components/forms/bank-form";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageIdentity } from "@/modules/identity/application/session";
import { getOwnBankProfile } from "@/modules/users/application/bank";

export const metadata = { title: "اطلاعات بانکی" };

export default async function BankProfilePage() {
  const identity = await requirePageIdentity();
  const profile = await getOwnBankProfile(identity);
  return (
    <>
      <PageHeader
        title="اطلاعات بانکی"
        description="مبلغ بازپرداخت به حساب متعلق به ثبت‌کننده درخواست واریز می‌شود."
      />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>حساب دریافت بازپرداخت</CardTitle>
        </CardHeader>
        <CardContent>
          <BankForm
            initialValues={{
              cardNumber: profile.cardNumber ?? "",
              iban: profile.iban ?? "",
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
