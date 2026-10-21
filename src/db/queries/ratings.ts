import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import type { SessionUser } from "@/auth/session";
import { RATING_PERIOD_DAYS, shortName, type RatingSide } from "@/domain/ratings";
import { flags as readFlags } from "@/domain/settings";

/**
 * Whom the ratings are about: an organisation as seller, or a person as a
 * private seller, as a buyer, or both.
 */
export type RatingTarget = { organisationId: string } | { profileId: string; as?: RatingSide };

export type RatingSummary = { average: number | null; count: number };

export type RatingItem = {
  id: string;
  score: number;
  comment: string | null;
  createdAt: Date;
  /** The side the rating came from. */
  side: RatingSide;
  raterName: string;
  listingTitle: string;
};

function targetCondition(target: RatingTarget): SQL {
  if ("organisationId" in target) return sql`r.side = 'buyer' and r.ratee_org_id = ${target.organisationId}`;
  if (target.as === "seller") {
    return sql`r.side = 'buyer' and r.ratee_profile_id = ${target.profileId} and r.ratee_org_id is null`;
  }
  if (target.as === "buyer") return sql`r.side = 'seller' and r.ratee_profile_id = ${target.profileId}`;
  return sql`r.ratee_profile_id = ${target.profileId} and (r.side = 'seller' or r.ratee_org_id is null)`;
}

/** Not hidden, and revealed: see ratingRevealed in the domain, which this mirrors in SQL. */
function visibleCondition(together: boolean): SQL {
  return sql`r.hidden_at is null and r.deleted_at is null and (
    not ${together}::boolean
    or exists (
      select 1 from ratings other
      where other.order_id = r.order_id and other.side <> r.side and other.deleted_at is null
    )
    or ord.completed_at + make_interval(days => ${RATING_PERIOD_DAYS}) <= now()
  )`;
}

export async function ratingSummary(target: RatingTarget): Promise<RatingSummary> {
  const { ratingsRevealTogether } = await readFlags();
  const rows = await db.execute<{ average: string | null; count: number }>(sql`
    select round(avg(r.score)::numeric, 1)::text as average, count(*)::int as count
    from ratings r
    join orders ord on ord.id = r.order_id
    where ${targetCondition(target)} and ${visibleCondition(ratingsRevealTogether)}
  `);
  const [row] = rows as unknown as { average: string | null; count: number }[];
  return { average: row?.average ? Number(row.average) : null, count: row?.count ?? 0 };
}

export async function ratingList(target: RatingTarget, limit = 20): Promise<RatingItem[]> {
  const { ratingsRevealTogether } = await readFlags();
  const rows = await db.execute(sql`
    select r.id, r.score, r.comment, r.created_at as "createdAt", r.side,
      l.title as "listingTitle",
      coalesce(case when r.side = 'seller' then org.name end, p.display_name) as "raterName",
      (r.side = 'seller' and org.id is not null) as "raterIsOrganisation"
    from ratings r
    join orders ord on ord.id = r.order_id
    join listings l on l.id = ord.listing_id
    join profiles p on p.id = r.rater_id
    left join organisations org on org.id = ord.seller_org_id
    where ${targetCondition(target)} and ${visibleCondition(ratingsRevealTogether)}
    order by r.created_at desc
    limit ${limit}
  `);
  return (rows as unknown as (RatingItem & { raterIsOrganisation: boolean })[]).map(
    ({ raterIsOrganisation, ...item }) => ({
      ...item,
      createdAt: new Date(item.createdAt),
      // An organisation is public anyway; a person appears with a shortened name.
      raterName: raterIsOrganisation ? item.raterName : shortName(item.raterName),
    }),
  );
}

export type PendingRating = {
  orderId: string;
  reference: string;
  listingTitle: string;
  side: RatingSide;
  counterpartName: string;
  periodEnds: Date;
};

/** Completed deals the user can still rate. */
export async function pendingRatings(user: SessionUser): Promise<PendingRating[]> {
  const orgIds = user.organisations.map((o) => o.id);
  const orgList = orgIds.length ? sql.join(orgIds.map((id) => sql`${id}::uuid`), sql`, `) : sql`null::uuid`;
  const rows = await db.execute(sql`
    select o.id as "orderId", o.reference, l.title as "listingTitle", o.side,
      case when o.side = 'buyer' then coalesce(org.name, seller.display_name) else buyer.display_name end
        as "counterpartName",
      o.completed_at + make_interval(days => ${RATING_PERIOD_DAYS}) as "periodEnds"
    from (
      select ord.*, case when ord.buyer_id = ${user.id} then 'buyer' else 'seller' end as side
      from orders ord
      where ord.status = 'completed'
        and ord.completed_at + make_interval(days => ${RATING_PERIOD_DAYS}) > now()
        and (ord.buyer_id = ${user.id} or ord.seller_id = ${user.id} or ord.seller_org_id in (${orgList}))
    ) o
    join listings l on l.id = o.listing_id
    join profiles buyer on buyer.id = o.buyer_id
    join profiles seller on seller.id = o.seller_id
    left join organisations org on org.id = o.seller_org_id
    where not exists (
      select 1 from ratings r
      where r.order_id = o.id and r.side::text = o.side and r.deleted_at is null
    )
    order by o.completed_at
  `);
  return (rows as unknown as PendingRating[]).map((row) => ({ ...row, periodEnds: new Date(row.periodEnds) }));
}

export type GivenRating = RatingItem & { rateeName: string; orderId: string; revealed: boolean; hidden: boolean };

/** What the user rated, with whether the other side can read it yet. */
export async function ratingsGivenBy(userId: string): Promise<GivenRating[]> {
  const { ratingsRevealTogether } = await readFlags();
  const rows = await db.execute(sql`
    select r.id, r.score, r.comment, r.created_at as "createdAt", r.side, r.order_id as "orderId",
      l.title as "listingTitle", me.display_name as "raterName",
      case when r.side = 'buyer' then coalesce(org.name, ratee.display_name) else ratee.display_name end
        as "rateeName",
      (r.hidden_at is not null) as hidden,
      (
        not ${ratingsRevealTogether}::boolean
        or exists (
          select 1 from ratings other
          where other.order_id = r.order_id and other.side <> r.side and other.deleted_at is null
        )
        or ord.completed_at + make_interval(days => ${RATING_PERIOD_DAYS}) <= now()
      ) as revealed
    from ratings r
    join orders ord on ord.id = r.order_id
    join listings l on l.id = ord.listing_id
    join profiles me on me.id = r.rater_id
    join profiles ratee on ratee.id = r.ratee_profile_id
    left join organisations org on org.id = r.ratee_org_id
    where r.rater_id = ${userId} and r.deleted_at is null
    order by r.created_at desc
  `);
  return (rows as unknown as GivenRating[]).map((row) => ({ ...row, createdAt: new Date(row.createdAt) }));
}
