import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { AlbumHeader } from "@/components/album/AlbumHeader";
import { Tracklist } from "@/components/album/Tracklist";

export const dynamic = "force-dynamic";

// Dedupe between generateMetadata and the page render within one request.
const getAlbum = cache(async (id: string) => {
  try {
    return await api.album(id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
});

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const a = await getAlbum(params.id);
  return {
    title: `${a.artist} — ${a.album}`,
    openGraph: a.cover ? { images: [a.cover] } : undefined,
  };
}

export default async function AlbumPage({ params }: { params: { id: string } }) {
  const album = await getAlbum(params.id);

  return (
    <article className="space-y-20">
      <Link
        href="/history"
        className="group -mt-4 inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-white"
      >
        <span className="transition-transform duration-300 group-hover:-translate-x-1">←</span> Archive
      </Link>
      <AlbumHeader album={album} />
      <Tracklist album={album} />
    </article>
  );
}

