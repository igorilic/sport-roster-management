-- CreateEnum
CREATE TYPE "Sport" AS ENUM ('AMERICAN_FOOTBALL', 'BASKETBALL', 'VOLLEYBALL', 'WATERPOLO');

-- CreateEnum
CREATE TYPE "PositionType" AS ENUM ('QB', 'WR', 'TE', 'OL', 'HB', 'FB', 'DL', 'LB', 'DB', 'CUSTOM');

-- CreateEnum
CREATE TYPE "DepthChartPosition" AS ENUM ('FIRST', 'SECOND', 'THIRD', 'OTHER');

-- CreateEnum
CREATE TYPE "SpecialTeamType" AS ENUM ('FIELD_GOAL', 'PUNT', 'KICKOFF', 'KICKOFF_RETURN', 'FIELD_GOAL_BLOCK', 'PUNT_RETURN', 'CUSTOM');

-- CreateEnum
CREATE TYPE "InvitationRole" AS ENUM ('TEAM_MAINTAINER', 'POSITION_MAINTAINER');

-- CreateEnum
CREATE TYPE "CustomLabelType" AS ENUM ('OFFENSE', 'DEFENSE', 'SPECIAL_TEAM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "logoUrl" TEXT,
    "sport" "Sport" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nickname" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMaintainer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "TeamMaintainer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "experience" INTEGER NOT NULL DEFAULT 0,
    "photoUrl" TEXT,
    "primaryPosition" "PositionType",
    "secondaryPosition" "PositionType",
    "depthChart" "DepthChartPosition" DEFAULT 'OTHER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OffensePlayer" (
    "id" TEXT NOT NULL,
    "position" "PositionType" NOT NULL,
    "customPosition" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "playerId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "OffensePlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DefensePlayer" (
    "id" TEXT NOT NULL,
    "position" "PositionType" NOT NULL,
    "customPosition" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "playerId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "DefensePlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialTeamPlayer" (
    "id" TEXT NOT NULL,
    "teamType" "SpecialTeamType" NOT NULL,
    "customTeamType" TEXT,
    "position" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "playerId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "SpecialTeamPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PositionMaintainer" (
    "id" TEXT NOT NULL,
    "positionType" "PositionType",
    "specialTeamType" "SpecialTeamType",
    "specialTeamPosition" TEXT,
    "customPosition" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "PositionMaintainer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "InvitationRole" NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomPositionLabel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CustomLabelType" NOT NULL,
    "specialTeamType" "SpecialTeamType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "CustomPositionLabel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMaintainer_userId_teamId_key" ON "TeamMaintainer"("userId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "OffensePlayer_playerId_key" ON "OffensePlayer"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "DefensePlayer_playerId_key" ON "DefensePlayer"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialTeamPlayer_playerId_teamType_position_key" ON "SpecialTeamPlayer"("playerId", "teamType", "position");

-- CreateIndex
CREATE UNIQUE INDEX "PositionMaintainer_userId_positionType_specialTeamType_spec_key" ON "PositionMaintainer"("userId", "positionType", "specialTeamType", "specialTeamPosition");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "CustomPositionLabel_name_organizationId_type_specialTeamTyp_key" ON "CustomPositionLabel"("name", "organizationId", "type", "specialTeamType");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMaintainer" ADD CONSTRAINT "TeamMaintainer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMaintainer" ADD CONSTRAINT "TeamMaintainer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffensePlayer" ADD CONSTRAINT "OffensePlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffensePlayer" ADD CONSTRAINT "OffensePlayer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefensePlayer" ADD CONSTRAINT "DefensePlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefensePlayer" ADD CONSTRAINT "DefensePlayer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialTeamPlayer" ADD CONSTRAINT "SpecialTeamPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialTeamPlayer" ADD CONSTRAINT "SpecialTeamPlayer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionMaintainer" ADD CONSTRAINT "PositionMaintainer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
