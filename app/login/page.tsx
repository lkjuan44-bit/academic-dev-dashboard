import { redirect } from "next/navigation";
import { Github } from "lucide-react";
import { auth } from "@/auth";
import { signInWithGitHub } from "./actions";

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }
  const { error } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-moss">
          Academic dashboard
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
          Tu espacio de estudio
        </h1>
        <p className="mt-3 leading-6 text-slate-600">
          Inicia sesión con la cuenta autorizada para ver y editar tus cursos,
          notas, horarios y tareas.
        </p>
        {error ? (
          <p
            className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
            role="alert"
          >
            Esta cuenta de GitHub no está autorizada para este panel.
          </p>
        ) : null}
        <form action={signInWithGitHub} className="mt-7">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 font-semibold text-white transition hover:bg-moss focus:outline-none focus:ring-2 focus:ring-moss focus:ring-offset-2"
          >
            <Github size={18} aria-hidden="true" />
            Continuar con GitHub
          </button>
        </form>
        <p className="mt-5 text-center text-xs leading-5 text-slate-500">
          El acceso está restringido al usuario de GitHub configurado en el
          despliegue.
        </p>
      </section>
    </main>
  );
}
