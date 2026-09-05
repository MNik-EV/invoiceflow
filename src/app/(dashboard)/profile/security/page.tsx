import { PasswordForm } from "@/components/forms/password-form";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "امنیت حساب" };

export default function SecurityPage() {
  return (
    <>
      <PageHeader
        title="امنیت حساب"
        description="رمز عبور محلی خود را تغییر دهید."
      />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>تغییر رمز عبور</CardTitle>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>
    </>
  );
}
