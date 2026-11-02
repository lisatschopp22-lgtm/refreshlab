import { describe, expect, it } from "vitest";
import { canHandleServiceRequests } from "@/domain/permissions";
import { checkServiceRequest, type ServiceRequestInput } from "@/domain/service-requests";

const base: ServiceRequestInput = {
  kind: "lab_clearance",
  contactName: "Lea Moser",
  email: "lea@example.test",
  details: {},
};

describe("service requests", () => {
  it("take a lab clearance with just a name and an e-mail", () => {
    expect(checkServiceRequest(base)).toBeNull();
  });

  it("need the instrument for maintenance", () => {
    expect(checkServiceRequest({ ...base, kind: "maintenance" })).toBe("invalid");
    expect(checkServiceRequest({ ...base, kind: "maintenance", details: { instrument: "Centrifuge 5810 R" } })).toBeNull();
  });

  it("take chemicals only from an organisation, unopened and with a safety data sheet", () => {
    const chemicals: ServiceRequestInput = {
      ...base,
      kind: "chemicals",
      organisationName: "LifeScience Basel AG",
      details: { substance: "Ethanol", quantity: "6 × 1 l", sealed: "yes", sds: "yes" },
    };
    expect(checkServiceRequest(chemicals)).toBeNull();
    expect(checkServiceRequest({ ...chemicals, organisationName: "" })).toBe("chemicals_rules");
    expect(checkServiceRequest({ ...chemicals, details: { ...chemicals.details, sealed: "" } })).toBe(
      "chemicals_rules",
    );
    expect(checkServiceRequest({ ...chemicals, details: { ...chemicals.details, sds: "" } })).toBe("chemicals_rules");
    expect(checkServiceRequest({ ...chemicals, details: { ...chemicals.details, substance: "" } })).toBe("invalid");
  });

  it("are followed up by an admin only", () => {
    const person = {
      id: "p",
      email: "p@example.test",
      displayName: "P",
      locale: "de",
      avatarPath: null,
      suspendedAt: null,
      verifiedAt: null,
      organisations: [],
    };
    expect(canHandleServiceRequests({ ...person, role: "admin" })).toBe(true);
    expect(canHandleServiceRequests({ ...person, role: "user" })).toBe(false);
    expect(canHandleServiceRequests(null)).toBe(false);
  });
});
