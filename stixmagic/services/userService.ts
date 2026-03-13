import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface CreateOrGetUserInput {
  telegram_id: number;
  telegram_username?: string;
}

/**
 * Creates a new user or returns the existing one by telegram_id.
 */
export async function createOrGetUser(input: CreateOrGetUserInput) {
  const { telegram_id, telegram_username } = input;

  const existing = await prisma.user.findUnique({
    where: { telegram_id: BigInt(telegram_id) },
  });

  if (existing) {
    return existing;
  }

  const user = await prisma.user.create({
    data: {
      telegram_id: BigInt(telegram_id),
      telegram_username: telegram_username ?? null,
      plan: "free",
      subscription_status: "inactive",
    },
  });

  return user;
}

/**
 * Returns a user by their Telegram ID.
 */
export async function getUserByTelegramId(telegram_id: number) {
  return prisma.user.findUnique({
    where: { telegram_id: BigInt(telegram_id) },
  });
}

/**
 * Updates a user's plan and subscription status.
 */
export async function updateUserPlan(
  telegram_id: number,
  plan: string,
  subscription_status: string
) {
  return prisma.user.update({
    where: { telegram_id: BigInt(telegram_id) },
    data: { plan, subscription_status },
  });
}
