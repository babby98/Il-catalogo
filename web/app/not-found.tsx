import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-[50vh] place-items-center text-center">
      <div>
        <p className="data text-8xl font-black tracking-tightest text-white/10">404</p>
        <p className="mt-2 text-lg text-zinc-300">This record isn’t in the catalogue.</p>
        <Link href="/history" className="mt-6 inline-block text-sm text-accent-soft hover:text-white">
          Browse the archive →
        </Link>
      </div>
    </div>
  );
}

