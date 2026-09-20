import { describe, expect, it } from "vitest";
import {
  adminAuditLog,
  adminComments,
  adminListings,
  adminModels,
  adminOrders,
  adminOrganisations,
  adminOverview,
  adminPages,
  adminUser,
  adminUsers,
  duplicateModelCandidates,
  messageReports,
  moderationQueue,
} from "@/db/queries/admin";
import { marketplaceMetrics } from "@/domain/admin";

/**
 * Every one of these builds correlated subqueries by hand. Drizzle renders a
 * column inside a `sql` template unqualified, which Postgres rejects as
 * ambiguous, and that only shows up at runtime. Running each query once is
 * what catches it.
 */
describe("admin queries", () => {
  it("summarises the marketplace", async () => {
    const overview = await adminOverview();
    expect(overview.users).toBeGreaterThan(0);
    expect(overview.activeListings).toBeGreaterThan(0);
    expect(Number(overview.gmvCents)).toBeGreaterThanOrEqual(0);
  });

  it("orders the moderation queue by risk, open first", async () => {
    const queue = await moderationQueue(20);
    expect(queue.length).toBeGreaterThan(0);

    const open = queue.filter((row) => row.status === "open");
    const scores = open.map((row) => row.riskScore?.score ?? 0);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    // Each row resolves a human-readable subject, not a bare id.
    expect(open.every((row) => row.subject)).toBe(true);
  });

  it("lists and searches users", async () => {
    const all = await adminUsers();
    expect(all.length).toBeGreaterThan(10);

    const found = await adminUsers("anna");
    expect(found.length).toBe(1);
    expect(found[0]!.email).toContain("anna");
    expect(found[0]!.listingCount).toBeGreaterThanOrEqual(0);
  });

  it("loads one user with their content", async () => {
    const [anna] = await adminUsers("anna");
    const detail = await adminUser(anna!.id);
    expect(detail?.profile.email).toContain("anna");
    expect(Array.isArray(detail?.listings)).toBe(true);
    expect(Array.isArray(detail?.comments)).toBe(true);
  });

  it("lists listings, including hidden ones on request", async () => {
    const visible = await adminListings();
    const withDeleted = await adminListings(undefined, true);
    expect(visible.length).toBeGreaterThan(0);
    expect(withDeleted.length).toBeGreaterThanOrEqual(visible.length);
    expect(visible.every((row) => row.deletedAt === null)).toBe(true);
  });

  it("filters listings by status", async () => {
    const active = await adminListings("active");
    expect(active.every((row) => row.status === "active")).toBe(true);
  });

  it("lists comments, models, orders and organisations", async () => {
    expect((await adminComments()).length).toBeGreaterThan(0);
    expect((await adminModels()).length).toBeGreaterThan(0);
    expect((await adminOrders()).length).toBeGreaterThan(0);

    // The seeded three must be there. An exact count would break whenever an
    // end-to-end run has left one of its own behind.
    const organisations = await adminOrganisations();
    const slugs = organisations.map((row) => row.slug);
    expect(slugs).toEqual(
      expect.arrayContaining(["biorefurb", "lifescience-basel", "epfl-bioengineering"]),
    );
  });

  it("puts proposed models before published ones", async () => {
    const models = await adminModels();
    const firstPublished = models.findIndex((model) => model.status === "published");
    const lastPending = models.map((m) => m.status).lastIndexOf("pending");
    if (lastPending >= 0 && firstPublished >= 0) {
      expect(lastPending).toBeLessThan(firstPublished);
    }
  });

  it("reads the audit log, duplicates, pages and reported messages", async () => {
    expect(Array.isArray(await adminAuditLog(10))).toBe(true);
    expect(Array.isArray(await duplicateModelCandidates())).toBe(true);
    expect((await adminPages()).length).toBeGreaterThan(0);
    expect(Array.isArray(await messageReports())).toBe(true);
  });

  it("computes marketplace metrics", async () => {
    const metrics = await marketplaceMetrics();
    expect(metrics.activeListings).toBeGreaterThan(0);
    expect(metrics.disputeRate).toBeGreaterThanOrEqual(0);
  });
});
