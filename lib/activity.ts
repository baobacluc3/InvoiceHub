import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type LogActivityParams = {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
};

export async function logActivity(params: LogActivityParams) {
  return prisma.activityLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata,
    },
  });
}
