-- CreateTable
CREATE TABLE "Operator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "personnelCode" TEXT NOT NULL,
    "agency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "vehicle" TEXT,
    "pinHash" TEXT,
    "pinSalt" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Incident" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "incidentNumber" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "assignedOperatorId" TEXT,
    "imageUrl" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "region" TEXT NOT NULL,
    "incidentType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'Low',
    "colorCode" TEXT NOT NULL DEFAULT 'Green',
    "aiSummary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "assignedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "acceptedAt" DATETIME,
    "arrivedAt" DATETIME,
    "completedAt" DATETIME,
    "completionNote" TEXT,
    "enRouteAt" DATETIME,
    "operatorStatus" TEXT,
    "workStartedAt" DATETIME,
    FOREIGN KEY ("assignedOperatorId") REFERENCES "Operator" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY ("reporterId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Incident" ("aiSummary", "colorCode", "createdAt", "description", "id", "imageUrl", "incidentNumber", "incidentType", "latitude", "longitude", "region", "reporterId", "severity", "status", "updatedAt") SELECT "aiSummary", "colorCode", "createdAt", "description", "id", "imageUrl", "incidentNumber", "incidentType", "latitude", "longitude", "region", "reporterId", "severity", "status", "updatedAt" FROM "Incident";
DROP TABLE "Incident";
ALTER TABLE "new_Incident" RENAME TO "Incident";
CREATE INDEX "Incident_region_idx" ON "Incident"("region" ASC);
CREATE INDEX "Incident_severity_idx" ON "Incident"("severity" ASC);
CREATE INDEX "Incident_status_idx" ON "Incident"("status" ASC);
CREATE INDEX "Incident_assignedOperatorId_idx" ON "Incident"("assignedOperatorId" ASC);
CREATE INDEX "Incident_reporterId_idx" ON "Incident"("reporterId" ASC);
CREATE UNIQUE INDEX "Incident_incidentNumber_key" ON "Incident"("incidentNumber" ASC);
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Operator_status_idx" ON "Operator"("status" ASC);

-- CreateIndex
CREATE INDEX "Operator_agency_idx" ON "Operator"("agency" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Operator_personnelCode_key" ON "Operator"("personnelCode" ASC);
