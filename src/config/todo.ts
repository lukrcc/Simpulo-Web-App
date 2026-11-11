// Your houses › Needs you: always three columns in a fixed order – Pay · Reply · Set up. Every task belongs to exactly one of them (the
// table below is the one place for that); within a column the tasks are by deadline (soonest first, none last), at most four, then "+N more".

export type TodoGroup = "pay" | "reply" | "setup";

/** The three columns, in their order. */
export const TODO_GROUPS: readonly TodoGroup[] = ["pay", "reply", "setup"];

/**
 * Every task Needs you knows, by its fixed name. Some aren't produced yet (pay_balance, application_deposit, review_applications,
 * answer_question) – their column is set here already, so they land in the right place the day they come.
 */
export type TodoTask =
  | "pay_share"
  | "pay_balance"
  | "application_deposit"
  | "review_requests"
  | "review_applications"
  | "answer_invite"
  | "overlap_pick_one"
  | "answer_question"
  | "confirm_booking"
  | "setup_payouts"
  | "verify_id"
  | "complete_profile";

/**
 * The fixed assignment:
 * - Pay = pay_share, pay_balance, application_deposit (what costs money now)
 * - Reply = review_requests, review_applications, answer_invite, overlap_pick_one, answer_question (others wait on your answer)
 * - Set up = confirm_booking, setup_payouts, verify_id, complete_profile (the rest)
 */
export const TODO_TASK_GROUP: Record<TodoTask, TodoGroup> = {
  pay_share: "pay",
  pay_balance: "pay",
  application_deposit: "pay",
  review_requests: "reply",
  review_applications: "reply",
  answer_invite: "reply",
  overlap_pick_one: "reply",
  answer_question: "reply",
  confirm_booking: "setup",
  setup_payouts: "setup",
  verify_id: "setup",
  complete_profile: "setup",
};

/** The kinds the app produces today (lib/houseTasks.ts and the account's own), each one of the tasks above. */
export type TodoKind = "pay" | "offer" | "requests" | "invite" | "overlap" | "book" | "choosePlace" | "payouts" | "profile" | "verify";

export const TODO_TASK_OF: Record<TodoKind, TodoTask> = {
  pay: "pay_share",
  // A spot from the waitlist: taking it is paying your share.
  offer: "pay_share",
  requests: "review_requests",
  invite: "answer_invite",
  overlap: "overlap_pick_one",
  book: "confirm_booking",
  // Choosing the place is the step before the booking: the same column.
  choosePlace: "confirm_booking",
  payouts: "setup_payouts",
  profile: "complete_profile",
  verify: "verify_id",
};

/** A kind's column, from the fixed assignment. */
export const TODO_GROUP = Object.fromEntries(Object.entries(TODO_TASK_OF).map(([kind, task]) => [kind, TODO_TASK_GROUP[task]])) as Record<TodoKind, TodoGroup>;

/** Under this many hours left, a deadline turns orange. */
export const TODO_URGENT_HOURS = 24;
