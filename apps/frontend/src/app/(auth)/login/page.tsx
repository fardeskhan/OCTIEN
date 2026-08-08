import { EnterpriseAuthLayout } from "@/components/auth/EnterpriseAuthLayout";
import { EnterpriseLoginForm } from "@/components/auth/EnterpriseLoginForm";

export default function LoginPage() {
  return (
    <EnterpriseAuthLayout>
      <EnterpriseLoginForm />
    </EnterpriseAuthLayout>
  );
}
