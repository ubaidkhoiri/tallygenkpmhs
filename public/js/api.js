// Client API Worker. Task 1: ambil dashboard, null bila gagal.
// Polling 30 detik dan cache localStorage masuk pada Task 5.

export async function fetchDashboard() {
  try {
    const res = await fetch("/api/dashboard");
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
