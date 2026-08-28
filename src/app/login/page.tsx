import { ReceiptText, Wrench, Building2 } from "lucide-react";
import { LoginForm } from "@/components/login-form";

const highlights = [
  { icon: Building2, text: "Sınırsız site ve daire hiyerarşisini tek panelden yönetin" },
  { icon: ReceiptText, text: "Aidat tahsilatını ve gider takibini dijitalleştirin" },
  { icon: Wrench, text: "Bakım, arıza ve tedarikçi süreçlerini kayıt altına alın" },
];

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-[oklch(0.28_0.09_264)] via-[oklch(0.36_0.15_268)] to-[oklch(0.5_0.19_264)] p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-white/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-black/20 blur-3xl"
          aria-hidden
        />

        <div className="relative flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-white/15 text-base font-bold backdrop-blur">
            A
          </div>
          <span className="text-lg font-semibold tracking-tight">Apsis</span>
        </div>

        <div className="relative max-w-md space-y-8">
          <h1 className="text-3xl leading-tight font-semibold text-balance">
            Site ve apartman yönetimini tek merkezden yürütün
          </h1>
          <ul className="space-y-4">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-white/80">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-white/10">
                  <Icon className="size-3.5" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/45">
          Yönetim şirketleri için site ve apartman otomasyonu
        </p>
      </div>

      <div className="flex w-full items-center justify-center bg-background p-6 lg:w-1/2">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[oklch(0.42_0.19_290)] text-base font-bold text-primary-foreground">
              A
            </div>
            <span className="text-lg font-semibold tracking-tight">Apsis</span>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight">Tekrar hoş geldiniz</h2>
            <p className="text-sm text-muted-foreground">
              Yönetim paneline erişmek için giriş yapın
            </p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
