-- DropForeignKey
ALTER TABLE "public"."DailyReport" DROP CONSTRAINT "DailyReport_userId_fkey";

-- AddForeignKey
ALTER TABLE "DailyReport" ADD CONSTRAINT "DailyReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
