import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-lg border border-neutral-200 p-8 text-center dark:border-neutral-800">
      <h1 className="text-lg font-semibold">Plan not found</h1>
      <p className="mt-1 text-sm text-neutral-500">
        This plan link doesn&apos;t exist or may have expired.
      </p>
      <Link
        href="/"
        className="mt-4 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-neutral-900"
      >
        Make your own plan
      </Link>
    </div>
  );
}
