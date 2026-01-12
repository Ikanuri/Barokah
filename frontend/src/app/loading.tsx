export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--ios-blue)] mx-auto mb-4"></div>
        <p className="text-[var(--text-secondary)]">Memuat...</p>
      </div>
    </div>
  );
}
