import { randomUUID } from "crypto";
import { execFileSync } from "child_process";

const BASE = process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000";
const POSTGRES_CONTAINER = process.env.INSFORGE_POSTGRES_CONTAINER || "insforge-backend-postgres-1";
const SERVICES = ["tax", "formation", "insurance", "notary", "bookkeeping"] as const;
type ServiceType = typeof SERVICES[number];

function sql(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function pgJson<T>(query: string): T {
  const output = execFileSync("docker", [
    "exec",
    POSTGRES_CONTAINER,
    "psql",
    "-U",
    "postgres",
    "-d",
    "insforge",
    "-t",
    "-A",
    "-c",
    query,
  ], { encoding: "utf8" }).trim();
  if (!output) throw new Error("Postgres query returned no data");
  return JSON.parse(output) as T;
}

function pdfBlob(label: string) {
  const body = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Count 1 /Kids [3 0 R] >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length ${label.length + 46} >>
stream
BT /F1 12 Tf 20 120 Td (${label}) Tj ET
endstream
endobj
trailer
<< /Root 1 0 R >>
%%EOF`;
  return new Blob([body], { type: "application/pdf" });
}

async function ensureProfile(role: string, email: string, legalName: string) {
  const authUserId = `e2e-${role}-${randomUUID()}`;
  return pgJson<{ id: string; auth_user_id: string; email: string; role: string }>(`
    WITH inserted AS (
      INSERT INTO user_profiles (auth_user_id, email, legal_name, role, is_active)
      VALUES (${sql(authUserId)}, ${sql(email)}, ${sql(legalName)}, ${sql(role)}, true)
      RETURNING id, auth_user_id, email, role
    )
    SELECT row_to_json(inserted) FROM inserted;
  `);
}

async function request(path: string, authUserId: string, init: RequestInit = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Cookie: `d_user_id=${authUserId}`,
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`${init.method || "GET"} ${url} failed ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function main() {
  const stamp = Date.now();
  const client = await ensureProfile("client", `e2e-client-${stamp}@dfgbusiness.test`, "E2E Client");
  const staff = await ensureProfile("super_admin", `e2e-staff-${stamp}@dfgbusiness.test`, "E2E Staff");

  const results = [];
  for (const serviceType of SERVICES) {
    results.push(await runServiceLifecycle(serviceType, client, staff));
  }

  console.log(JSON.stringify({
    success: results.every((result) => result.finalStatus === "completed" && result.progress === 100),
    clientProfileId: client.id,
    staffProfileId: staff.id,
    results,
  }, null, 2));
}

async function runServiceLifecycle(
  serviceType: ServiceType,
  client: { id: string; auth_user_id: string; email: string },
  staff: { id: string; auth_user_id: string; email: string },
) {
  const intake = await request("/api/services/enroll", client.auth_user_id, {
    method: "POST",
    body: JSON.stringify({
      serviceType,
      action: "submit",
      intakeData: intakeFor(serviceType),
    }),
  });
  const enrollmentId = intake.enrollmentId;
  if (!enrollmentId) throw new Error(`${serviceType} enrollment was not created`);

  if (!intake.workflowId) {
    await request(`/api/workflows/${serviceType}`, client.auth_user_id, {
      method: "POST",
      body: JSON.stringify({ enrollmentId, clientEmail: client.email, clientName: "E2E Client", userId: client.id }),
    }).catch((error) => {
      console.warn(`[e2e] ${serviceType} workflow start skipped:`, error.message);
    });
  }

  const cases = await request(`/api/admin/cases?service=${serviceType}`, staff.auth_user_id);
  if (!cases.cases?.some((c: any) => c.id === enrollmentId)) throw new Error(`Submitted ${serviceType} case did not appear in staff queue`);

  const missing = await request(`/api/cases/${enrollmentId}/missing-docs`, staff.auth_user_id, {
    method: "POST",
    body: JSON.stringify({ documentName: `${serviceLabel(serviceType)} verification document`, instructions: "Upload the latest document for E2E verification." }),
  });
  const uploadUrl = new URL(missing.uploadUrl);
  const token = uploadUrl.pathname.split("/").pop();
  if (!token) throw new Error("Missing document upload token was not generated");

  const docForm = new FormData();
  docForm.append("files", pdfBlob(`E2E ${serviceType} source document`), `${serviceType}-source-e2e.pdf`);
  await request(`/api/vault/public-upload?token=${token}`, client.auth_user_id, { method: "POST", body: docForm });

  await request(`/api/cases/${enrollmentId}/messages`, staff.auth_user_id, {
    method: "POST",
    body: JSON.stringify({ message: `Your ${serviceLabel(serviceType)} documents are received. We are preparing your case.` }),
  });
  await request(`/api/cases/${enrollmentId}/messages`, client.auth_user_id, {
    method: "POST",
    body: JSON.stringify({ message: "Thank you. Please proceed." }),
  });

  const deliverableForm = new FormData();
  deliverableForm.append("title", `E2E ${serviceLabel(serviceType)} Deliverable`);
  deliverableForm.append("description", "Automated deliverable for lifecycle verification.");
  deliverableForm.append("requiresApproval", "true");
  deliverableForm.append("file", pdfBlob(`E2E ${serviceType} deliverable`), `${serviceType}-deliverable-e2e.pdf`);
  const delivered = await request(`/api/cases/${enrollmentId}/deliverables`, staff.auth_user_id, { method: "POST", body: deliverableForm });

  await request(`/api/cases/${enrollmentId}/approve`, client.auth_user_id, {
    method: "POST",
    body: JSON.stringify({ deliverableId: delivered.deliverable.id }),
  });
  await request(`/api/cases/${enrollmentId}/complete`, staff.auth_user_id, { method: "POST" });

  const finalCase = await request(`/api/cases/${enrollmentId}`, client.auth_user_id);
  const enrollment = finalCase.case?.enrollment;
  if (enrollment?.status !== "completed" || enrollment?.progress !== 100) {
    throw new Error(`${serviceType} case did not complete correctly`);
  }

  return {
    serviceType,
    enrollmentId,
    finalStatus: enrollment.status,
    progress: enrollment.progress,
  };
}

function intakeFor(serviceType: ServiceType) {
  const common = { notes: "Automated E2E lifecycle probe" };
  if (serviceType === "tax") return { ...common, filingType: "personal", taxYear: "2025", incomeTypes: ["W-2"] };
  if (serviceType === "formation") return { ...common, businessName: `E2E Test LLC ${Date.now()}`, entityType: "LLC", state: "DE", ownerCount: 1 };
  if (serviceType === "insurance") return { ...common, zipCode: "19720", vehicleYear: "2022", vehicleMake: "Toyota", vehicleModel: "Camry", coverageLevel: "standard" };
  if (serviceType === "notary") return { ...common, sessionType: "in_person", documentType: "Affidavit", appointmentPreference: "weekday" };
  return { ...common, businessType: "service", monthlyTransactions: "50", bankConnection: "manual" };
}

function serviceLabel(serviceType: ServiceType) {
  return {
    tax: "Tax Preparation",
    formation: "Business Formation",
    insurance: "Auto Insurance",
    notary: "Notary Services",
    bookkeeping: "Bookkeeping",
  }[serviceType];
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
