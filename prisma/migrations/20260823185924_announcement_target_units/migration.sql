-- CreateTable
CREATE TABLE "_AnnouncementToUnit" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AnnouncementToUnit_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_AnnouncementToUnit_B_index" ON "_AnnouncementToUnit"("B");

-- AddForeignKey
ALTER TABLE "_AnnouncementToUnit" ADD CONSTRAINT "_AnnouncementToUnit_A_fkey" FOREIGN KEY ("A") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AnnouncementToUnit" ADD CONSTRAINT "_AnnouncementToUnit_B_fkey" FOREIGN KEY ("B") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
