import type { SessionUser } from "@/auth/session";

/**
 * The single place that answers "may this person do that". The prototype has
 * no row-level security, so every mutation asks here first. If production
 * later wants browser-side Supabase access, these rules are what has to be
 * mirrored into RLS policies.
 */

export type OwnedResource = {
  sellerProfileId?: string | null;
  sellerOrgId?: string | null;
  authorId?: string | null;
  profileId?: string | null;
  buyerId?: string | null;
  sellerId?: string | null;
};

export const isAdmin = (user: SessionUser | null): boolean => user?.role === "admin";

export function memberOf(user: SessionUser | null, organisationId: string | null | undefined) {
  if (!user || !organisationId) return false;
  return user.organisations.some((o) => o.id === organisationId);
}

export function ownerOf(user: SessionUser | null, organisationId: string | null | undefined) {
  if (!user || !organisationId) return false;
  return user.organisations.some((o) => o.id === organisationId && o.role === "owner");
}

/** Owns it personally, or through the organisation that published it. */
export function canEditListing(user: SessionUser | null, listing: OwnedResource) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (listing.sellerProfileId === user.id) return true;
  return memberOf(user, listing.sellerOrgId);
}

export function canPublishListing(user: SessionUser | null, organisationId?: string | null) {
  if (!user || user.suspendedAt) return false;
  if (!organisationId) return true;
  return user.organisations.some((o) => o.id === organisationId && o.canPublish);
}

export function canEditComment(user: SessionUser | null, comment: OwnedResource) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  return comment.authorId === user.id;
}

export function canDeleteComment(user: SessionUser | null, comment: OwnedResource) {
  return canEditComment(user, comment);
}

export function canReadConversation(user: SessionUser | null, participantIds: string[]) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  return participantIds.includes(user.id);
}

export function canViewOrder(user: SessionUser | null, order: OwnedResource) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  return order.buyerId === user.id || order.sellerId === user.id || memberOf(user, order.sellerOrgId);
}

export function canActAsBuyer(user: SessionUser | null, order: OwnedResource) {
  return !!user && (order.buyerId === user.id || isAdmin(user));
}

export function canActAsSeller(user: SessionUser | null, order: OwnedResource) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  return order.sellerId === user.id || memberOf(user, order.sellerOrgId);
}

/** You cannot bid on your own instrument, nor message yourself. */
export function canOfferOn(user: SessionUser | null, listing: OwnedResource) {
  if (!user || user.suspendedAt) return false;
  if (listing.sellerProfileId === user.id) return false;
  if (memberOf(user, listing.sellerOrgId)) return false;
  return true;
}

export function canEditProfile(user: SessionUser | null, profileId: string) {
  if (!user) return false;
  return isAdmin(user) || user.id === profileId;
}

export function canManageOrganisation(user: SessionUser | null, organisationId: string) {
  return isAdmin(user) || ownerOf(user, organisationId);
}

export class PermissionError extends Error {
  constructor(message = "Not allowed") {
    super(message);
    this.name = "PermissionError";
  }
}

export function assert(condition: boolean, message?: string): asserts condition {
  if (!condition) throw new PermissionError(message);
}
