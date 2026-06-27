export async function submitIntake(serviceType: string, intakeData: Record<string, unknown>) {
  const res = await fetch("/api/services/enroll", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ serviceType, intakeData, action: "submit" }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not submit intake");
  return data;
}
