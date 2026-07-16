export default function Loading() {
  return <main aria-busy="true" aria-label="페이지를 불러오는 중" className="flex min-h-screen items-center justify-center bg-white px-6 text-black"><div className="w-full max-w-xl animate-pulse motion-reduce:animate-none"><div className="mx-auto h-10 w-24 rounded bg-zinc-200"/><div className="mx-auto mt-5 h-5 w-64 max-w-full rounded bg-zinc-100"/><div className="mt-12 h-14 rounded-xl bg-zinc-100"/><div className="mt-5 h-12 rounded-xl bg-zinc-200"/><p className="sr-only" role="status">한잎을 불러오고 있어요.</p></div></main>;
}
