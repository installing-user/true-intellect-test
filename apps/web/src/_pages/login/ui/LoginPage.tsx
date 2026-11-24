import { LoginForm } from '@/features/auth';
import { Brand } from '@/shared/ui/brand';
import './login-page.css';

export function LoginPage() {
  return (
    <main className="login">
      <Brand />
      <div className="login-card">
        <LoginForm />
      </div>
    </main>
  );
}
