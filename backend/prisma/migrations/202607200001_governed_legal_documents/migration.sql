-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'STAFF', 'DRIVER', 'CREW_LEAD');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('WEBSITE', 'PHONE', 'REFERRAL', 'GOOGLE_ADS', 'FACEBOOK', 'YELP', 'THUMBTACK', 'OTHER');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'SURVEY_SCHEDULED', 'QUOTED', 'NEGOTIATING', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "MoveType" AS ENUM ('LOCAL', 'LONG_DISTANCE', 'COMMERCIAL', 'STORAGE', 'PACKING_ONLY');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('APARTMENT', 'HOUSE', 'CONDO', 'TOWNHOUSE', 'OFFICE', 'WAREHOUSE', 'STORAGE_UNIT');

-- CreateEnum
CREATE TYPE "FollowUpType" AS ENUM ('CALL', 'EMAIL', 'TEXT', 'IN_PERSON');

-- CreateEnum
CREATE TYPE "SurveyType" AS ENUM ('VIRTUAL', 'ON_SITE');

-- CreateEnum
CREATE TYPE "ItemCategory" AS ENUM ('FURNITURE', 'ELECTRONICS', 'APPLIANCE', 'BOXES', 'FRAGILE', 'ARTWORK', 'ANTIQUE', 'PIANO', 'POOL_TABLE', 'GYM_EQUIPMENT', 'OUTDOOR', 'GARAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "ItemCondition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED');

-- CreateEnum
CREATE TYPE "QuoteType" AS ENUM ('BINDING', 'NON_BINDING', 'NOT_TO_EXCEED');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "InsuranceOption" AS ENUM ('BASIC', 'FULL_VALUE', 'THIRD_PARTY');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'LOADING', 'IN_TRANSIT', 'UNLOADING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CrewRole" AS ENUM ('DRIVER', 'CREW_LEAD', 'MOVER', 'PACKER');

-- CreateEnum
CREATE TYPE "TruckType" AS ENUM ('PICKUP', 'CARGO_VAN', 'BOX_TRUCK_12', 'BOX_TRUCK_16', 'BOX_TRUCK_20', 'BOX_TRUCK_26', 'SEMI');

-- CreateEnum
CREATE TYPE "EquipmentType" AS ENUM ('DOLLY', 'HAND_TRUCK', 'FURNITURE_PAD', 'STRAP', 'TOOL_KIT', 'PIANO_BOARD', 'APPLIANCE_DOLLY', 'STAIR_CLIMBER', 'LIFT_GATE', 'CRATE');

-- CreateEnum
CREATE TYPE "TimeEntryType" AS ENUM ('DRIVE_TO_ORIGIN', 'LOADING', 'DRIVE_TO_DEST', 'UNLOADING', 'BREAK', 'OTHER');

-- CreateEnum
CREATE TYPE "StorageStatus" AS ENUM ('RESERVED', 'ACTIVE', 'ENDED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "CommunicationType" AS ENUM ('EMAIL', 'SMS', 'PHONE', 'IN_APP');

-- CreateEnum
CREATE TYPE "CommunicationDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "CommunicationStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "TemplateTrigger" AS ENUM ('BOOKING_CONFIRMATION', 'PRE_MOVE_REMINDER_7DAY', 'PRE_MOVE_REMINDER_1DAY', 'DAY_OF_UPDATE', 'JOB_STARTED', 'JOB_COMPLETED', 'POST_MOVE_FOLLOWUP', 'REVIEW_REQUEST');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CHECK', 'CREDIT_CARD', 'DEBIT_CARD', 'ACH', 'ZELLE', 'VENMO', 'OTHER');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'DENIED', 'SETTLED');

-- CreateEnum
CREATE TYPE "ClaimType" AS ENUM ('DAMAGE', 'LOSS', 'DELAY', 'OTHER');

-- CreateEnum
CREATE TYPE "LegalMatterStatus" AS ENUM ('OPEN', 'REVIEW', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "MatterAccessRole" AS ENUM ('OWNER', 'LEGAL_REVIEWER', 'CONTRIBUTOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "LegalDocumentType" AS ENUM ('EVIDENCE', 'CLAIM_FORM', 'SETTLEMENT_AGREEMENT', 'RELEASE', 'NOTICE', 'FILING_COVER_SHEET', 'SIGNATURE_CERTIFICATE', 'FILING_RECEIPT', 'EXPORT_MANIFEST', 'OTHER');

-- CreateEnum
CREATE TYPE "LegalDocumentStatus" AS ENUM ('DRAFT', 'REVIEW_PENDING', 'APPROVED', 'REJECTED', 'SIGNATURE_PENDING', 'SIGNED', 'FILING_PENDING', 'FILED', 'DISPOSITION_PENDING', 'DISPOSED');

-- CreateEnum
CREATE TYPE "DocumentVersionSource" AS ENUM ('UPLOAD', 'OCR_DERIVATION', 'AUTHORITATIVE_TEMPLATE', 'DETERMINISTIC_MERGE', 'SIGNED_PROVIDER', 'FILING_PROVIDER', 'EXPORT');

-- CreateEnum
CREATE TYPE "DocumentExtractionStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "LegalTemplateStatus" AS ENUM ('ACTIVE', 'SUPERSEDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "DocumentReviewDecision" AS ENUM ('APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SignatureEnvelopeStatus" AS ENUM ('PENDING', 'SENT', 'COMPLETED', 'DECLINED', 'FAILED', 'VOIDED');

-- CreateEnum
CREATE TYPE "FilingStatus" AS ENUM ('PENDING', 'FILED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "LegalIntegrationOperation" AS ENUM ('STORE', 'OCR', 'ESIGN', 'FILE', 'DISPOSE', 'TEMPLATE_SYNC');

-- CreateEnum
CREATE TYPE "IntegrationAttemptStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "authVersion" INTEGER NOT NULL DEFAULT 1,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifyToken" TEXT,
    "emailVerifyExpires" TIMESTAMP(3),
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "source" "LeadSource" NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "moveDate" TIMESTAMP(3),
    "moveType" "MoveType",
    "originAddress" TEXT,
    "originCity" TEXT,
    "originState" TEXT,
    "originZip" TEXT,
    "destAddress" TEXT,
    "destCity" TEXT,
    "destState" TEXT,
    "destZip" TEXT,
    "originPropertyType" "PropertyType",
    "originBedrooms" INTEGER,
    "originFloors" INTEGER,
    "originElevator" BOOLEAN,
    "originParkingDistance" INTEGER,
    "destPropertyType" "PropertyType",
    "destBedrooms" INTEGER,
    "destFloors" INTEGER,
    "destElevator" BOOLEAN,
    "destParkingDistance" INTEGER,
    "estimatedVolume" DOUBLE PRECISION,
    "specialItems" TEXT,
    "notes" TEXT,
    "qualificationScore" INTEGER,
    "qualifiedAt" TIMESTAMP(3),
    "qualifiedBy" TEXT,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "convertedAt" TIMESTAMP(3),

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" "FollowUpType" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "outcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Survey" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" "SurveyType" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "conductedBy" TEXT,
    "totalVolume" DOUBLE PRECISION,
    "totalWeight" DOUBLE PRECISION,
    "estimatedHours" DOUBLE PRECISION,
    "accessNotes" TEXT,
    "specialItems" TEXT,
    "packingNeeded" BOOLEAN NOT NULL DEFAULT false,
    "packingHours" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Survey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyPhoto" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "room" TEXT,
    "description" TEXT,
    "aiAnalysis" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT,
    "jobId" TEXT,
    "name" TEXT NOT NULL,
    "category" "ItemCategory" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "volume" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "isFragile" BOOLEAN NOT NULL DEFAULT false,
    "requiresCrating" BOOLEAN NOT NULL DEFAULT false,
    "specialHandling" TEXT,
    "condition" "ItemCondition" NOT NULL DEFAULT 'GOOD',
    "conditionNotes" TEXT,
    "boxNumber" TEXT,
    "labelId" TEXT,
    "loadedAt" TIMESTAMP(3),
    "unloadedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "type" "QuoteType" NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "estimatedHours" DOUBLE PRECISION NOT NULL,
    "crewSize" INTEGER NOT NULL,
    "laborRate" DOUBLE PRECISION NOT NULL,
    "laborTotal" DOUBLE PRECISION NOT NULL,
    "travelHours" DOUBLE PRECISION,
    "travelRate" DOUBLE PRECISION,
    "travelTotal" DOUBLE PRECISION,
    "packingHours" DOUBLE PRECISION,
    "packingRate" DOUBLE PRECISION,
    "packingTotal" DOUBLE PRECISION,
    "packingMaterials" DOUBLE PRECISION,
    "storageMonths" INTEGER,
    "storageFee" DOUBLE PRECISION,
    "insuranceOption" "InsuranceOption" NOT NULL DEFAULT 'BASIC',
    "insuranceFee" DOUBLE PRECISION,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountReason" TEXT,
    "taxes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "jobNumber" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'SCHEDULED',
    "moveDate" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "originAddress" TEXT NOT NULL,
    "originCity" TEXT NOT NULL,
    "originState" TEXT NOT NULL,
    "originZip" TEXT NOT NULL,
    "originNotes" TEXT,
    "destAddress" TEXT NOT NULL,
    "destCity" TEXT NOT NULL,
    "destState" TEXT NOT NULL,
    "destZip" TEXT NOT NULL,
    "destNotes" TEXT,
    "crewSize" INTEGER NOT NULL,
    "trucksNeeded" INTEGER NOT NULL DEFAULT 1,
    "equipmentNeeds" TEXT,
    "specialInstructions" TEXT,
    "actualHours" DOUBLE PRECISION,
    "actualCrewSize" INTEGER,
    "actualMileage" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobNote" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrewMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "role" "CrewRole" NOT NULL,
    "hourlyRate" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "licenseType" TEXT,
    "licenseExpiry" TIMESTAMP(3),
    "skills" TEXT[],
    "certifications" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrewMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrewAssignment" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "crewMemberId" TEXT NOT NULL,
    "userId" TEXT,
    "role" "CrewRole" NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrewAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Truck" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "vin" TEXT,
    "type" "TruckType" NOT NULL,
    "capacity" DOUBLE PRECISION NOT NULL,
    "maxWeight" DOUBLE PRECISION NOT NULL,
    "year" INTEGER,
    "make" TEXT,
    "model" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "currentMileage" DOUBLE PRECISION,
    "lastServiceDate" TIMESTAMP(3),
    "nextServiceDue" TIMESTAMP(3),
    "insuranceExpiry" TIMESTAMP(3),
    "registrationExpiry" TIMESTAMP(3),
    "gpsDeviceId" TEXT,
    "currentLocation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Truck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TruckAssignment" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "truckId" TEXT NOT NULL,
    "startMileage" DOUBLE PRECISION,
    "endMileage" DOUBLE PRECISION,
    "fuelUsed" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TruckAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "EquipmentType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "available" INTEGER NOT NULL,
    "condition" TEXT,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentAssignment" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "returnedAt" TIMESTAMP(3),
    "condition" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipmentAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "crewMemberId" TEXT NOT NULL,
    "type" "TimeEntryType" NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "duration" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorageUnit" (
    "id" TEXT NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "capacity" DOUBLE PRECISION NOT NULL,
    "monthlyRate" DOUBLE PRECISION NOT NULL,
    "isOccupied" BOOLEAN NOT NULL DEFAULT false,
    "floor" INTEGER,
    "climate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorageUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorageReservation" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "monthlyRate" DOUBLE PRECISION NOT NULL,
    "status" "StorageStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorageReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Communication" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "jobId" TEXT,
    "userId" TEXT,
    "type" "CommunicationType" NOT NULL,
    "direction" "CommunicationDirection" NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "status" "CommunicationStatus" NOT NULL DEFAULT 'SENT',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "templateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Communication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CommunicationType" NOT NULL,
    "trigger" "TemplateTrigger",
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "laborHours" DOUBLE PRECISION NOT NULL,
    "laborRate" DOUBLE PRECISION NOT NULL,
    "laborTotal" DOUBLE PRECISION NOT NULL,
    "travelHours" DOUBLE PRECISION,
    "travelRate" DOUBLE PRECISION,
    "travelTotal" DOUBLE PRECISION,
    "packingMaterials" DOUBLE PRECISION,
    "storageCharges" DOUBLE PRECISION,
    "insuranceFee" DOUBLE PRECISION,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountReason" TEXT,
    "taxes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "paidAmount" DOUBLE PRECISION,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceCharge" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "total" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "InvoiceCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedBy" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "itemId" TEXT,
    "status" "ClaimStatus" NOT NULL DEFAULT 'SUBMITTED',
    "type" "ClaimType" NOT NULL,
    "description" TEXT NOT NULL,
    "damagePhotos" TEXT[],
    "estimatedValue" DOUBLE PRECISION,
    "approvedAmount" DOUBLE PRECISION,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIVolumeEstimate" (
    "id" TEXT NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "roomType" TEXT,
    "estimatedVolume" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "itemsDetected" TEXT[],
    "analysis" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIVolumeEstimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIQuoteHistory" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "moveDetails" TEXT NOT NULL,
    "generatedQuote" DOUBLE PRECISION NOT NULL,
    "factors" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIQuoteHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "logo" TEXT,
    "laborRate" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "travelRate" DOUBLE PRECISION NOT NULL DEFAULT 35,
    "packingRate" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "minHours" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalMatter" (
    "id" TEXT NOT NULL,
    "matterNumber" TEXT NOT NULL,
    "creationKey" TEXT NOT NULL,
    "creationHash" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "status" "LegalMatterStatus" NOT NULL DEFAULT 'OPEN',
    "ownerId" TEXT NOT NULL,
    "jobId" TEXT,
    "claimId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "retentionUntil" TIMESTAMP(3),
    "legalHold" BOOLEAN NOT NULL DEFAULT false,
    "legalHoldReason" TEXT,
    "legalHoldSetAt" TIMESTAMP(3),
    "legalHoldSetById" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalMatter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatterAccessGrant" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MatterAccessRole" NOT NULL,
    "canViewPrivileged" BOOLEAN NOT NULL DEFAULT false,
    "grantedById" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "revokeReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "MatterAccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalDocument" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "documentType" "LegalDocumentType" NOT NULL,
    "status" "LegalDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "privileged" BOOLEAN NOT NULL DEFAULT false,
    "currentVersion" INTEGER NOT NULL DEFAULT 0,
    "lockVersion" INTEGER NOT NULL DEFAULT 1,
    "templateId" TEXT,
    "templateVersion" TEXT,
    "retentionUntil" TIMESTAMP(3),
    "disposedAt" TIMESTAMP(3),
    "disposedById" TEXT,
    "dispositionReason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalDocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "source" "DocumentVersionSource" NOT NULL,
    "parentVersionId" TEXT,
    "storageProvider" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sourceUri" TEXT,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "provenance" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentExtraction" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "status" "DocumentExtractionStatus" NOT NULL,
    "extractedText" TEXT,
    "confidence" DOUBLE PRECISION,
    "contentHash" TEXT,
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentExtraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalTemplate" (
    "id" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "documentType" "LegalDocumentType" NOT NULL,
    "version" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "sourceSystem" TEXT NOT NULL,
    "sourceUri" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "status" "LegalTemplateStatus" NOT NULL DEFAULT 'ACTIVE',
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentReview" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentVersion" INTEGER NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "decision" "DocumentReviewDecision" NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "templateId" TEXT,
    "templateVersion" TEXT,
    "comments" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignatureEnvelope" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentVersion" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "status" "SignatureEnvelopeStatus" NOT NULL DEFAULT 'PENDING',
    "signerEmailHash" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "lastProviderEvent" TEXT,

    CONSTRAINT "SignatureEnvelope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilingRecord" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentVersion" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "status" "FilingStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filedAt" TIMESTAMP(3),
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "receiptUri" TEXT,

    CONSTRAINT "FilingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationAttempt" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "entityId" TEXT,
    "operation" "LegalIntegrationOperation" NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" "IntegrationAttemptStatus" NOT NULL DEFAULT 'PENDING',
    "requestHash" TEXT NOT NULL,
    "responseHash" TEXT,
    "responseMetadata" JSONB,
    "externalId" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalAuditEvent" (
    "id" BIGSERIAL NOT NULL,
    "matterId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "previousHash" TEXT,
    "eventHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalWebhookReceipt" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalWebhookReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_passwordResetToken_idx" ON "User"("passwordResetToken");

-- CreateIndex
CREATE INDEX "User_emailVerifyToken_idx" ON "User"("emailVerifyToken");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_quoteNumber_key" ON "Quote"("quoteNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Job_jobNumber_key" ON "Job"("jobNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Job_leadId_key" ON "Job"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "Job_quoteId_key" ON "Job"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "CrewAssignment_jobId_crewMemberId_key" ON "CrewAssignment"("jobId", "crewMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "Truck_licensePlate_key" ON "Truck"("licensePlate");

-- CreateIndex
CREATE UNIQUE INDEX "TruckAssignment_jobId_truckId_key" ON "TruckAssignment"("jobId", "truckId");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentAssignment_jobId_equipmentId_key" ON "EquipmentAssignment"("jobId", "equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "StorageUnit_unitNumber_key" ON "StorageUnit"("unitNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_jobId_key" ON "Invoice"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "Claim_claimNumber_key" ON "Claim"("claimNumber");

-- CreateIndex
CREATE UNIQUE INDEX "LegalMatter_matterNumber_key" ON "LegalMatter"("matterNumber");

-- CreateIndex
CREATE UNIQUE INDEX "LegalMatter_creationKey_key" ON "LegalMatter"("creationKey");

-- CreateIndex
CREATE UNIQUE INDEX "LegalMatter_claimId_key" ON "LegalMatter"("claimId");

-- CreateIndex
CREATE INDEX "LegalMatter_ownerId_status_idx" ON "LegalMatter"("ownerId", "status");

-- CreateIndex
CREATE INDEX "LegalMatter_jobId_idx" ON "LegalMatter"("jobId");

-- CreateIndex
CREATE INDEX "LegalMatter_retentionUntil_idx" ON "LegalMatter"("retentionUntil");

-- CreateIndex
CREATE INDEX "MatterAccessGrant_userId_revokedAt_idx" ON "MatterAccessGrant"("userId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MatterAccessGrant_matterId_userId_key" ON "MatterAccessGrant"("matterId", "userId");

-- CreateIndex
CREATE INDEX "LegalDocument_matterId_status_idx" ON "LegalDocument"("matterId", "status");

-- CreateIndex
CREATE INDEX "LegalDocument_retentionUntil_idx" ON "LegalDocument"("retentionUntil");

-- CreateIndex
CREATE INDEX "LegalDocumentVersion_contentHash_idx" ON "LegalDocumentVersion"("contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "LegalDocumentVersion_documentId_version_key" ON "LegalDocumentVersion"("documentId", "version");

-- CreateIndex
CREATE INDEX "DocumentExtraction_documentId_createdAt_idx" ON "DocumentExtraction"("documentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentExtraction_provider_externalId_key" ON "DocumentExtraction"("provider", "externalId");

-- CreateIndex
CREATE INDEX "LegalTemplate_jurisdiction_documentType_status_effectiveFro_idx" ON "LegalTemplate"("jurisdiction", "documentType", "status", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "LegalTemplate_templateKey_jurisdiction_version_key" ON "LegalTemplate"("templateKey", "jurisdiction", "version");

-- CreateIndex
CREATE INDEX "DocumentReview_reviewerId_reviewedAt_idx" ON "DocumentReview"("reviewerId", "reviewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentReview_documentId_documentVersion_key" ON "DocumentReview"("documentId", "documentVersion");

-- CreateIndex
CREATE UNIQUE INDEX "SignatureEnvelope_idempotencyKey_key" ON "SignatureEnvelope"("idempotencyKey");

-- CreateIndex
CREATE INDEX "SignatureEnvelope_documentId_requestedAt_idx" ON "SignatureEnvelope"("documentId", "requestedAt");

-- CreateIndex
CREATE INDEX "SignatureEnvelope_provider_externalId_idx" ON "SignatureEnvelope"("provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "FilingRecord_idempotencyKey_key" ON "FilingRecord"("idempotencyKey");

-- CreateIndex
CREATE INDEX "FilingRecord_documentId_requestedAt_idx" ON "FilingRecord"("documentId", "requestedAt");

-- CreateIndex
CREATE INDEX "FilingRecord_provider_externalId_idx" ON "FilingRecord"("provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationAttempt_idempotencyKey_key" ON "IntegrationAttempt"("idempotencyKey");

-- CreateIndex
CREATE INDEX "IntegrationAttempt_matterId_operation_status_idx" ON "IntegrationAttempt"("matterId", "operation", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LegalAuditEvent_eventHash_key" ON "LegalAuditEvent"("eventHash");

-- CreateIndex
CREATE INDEX "LegalAuditEvent_matterId_id_idx" ON "LegalAuditEvent"("matterId", "id");

-- CreateIndex
CREATE INDEX "LegalAuditEvent_actorId_createdAt_idx" ON "LegalAuditEvent"("actorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LegalWebhookReceipt_provider_eventId_key" ON "LegalWebhookReceipt"("provider", "eventId");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyPhoto" ADD CONSTRAINT "SurveyPhoto_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobNote" ADD CONSTRAINT "JobNote_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewAssignment" ADD CONSTRAINT "CrewAssignment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewAssignment" ADD CONSTRAINT "CrewAssignment_crewMemberId_fkey" FOREIGN KEY ("crewMemberId") REFERENCES "CrewMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewAssignment" ADD CONSTRAINT "CrewAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TruckAssignment" ADD CONSTRAINT "TruckAssignment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TruckAssignment" ADD CONSTRAINT "TruckAssignment_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentAssignment" ADD CONSTRAINT "EquipmentAssignment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentAssignment" ADD CONSTRAINT "EquipmentAssignment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_crewMemberId_fkey" FOREIGN KEY ("crewMemberId") REFERENCES "CrewMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageReservation" ADD CONSTRAINT "StorageReservation_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "StorageUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CommunicationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceCharge" ADD CONSTRAINT "InvoiceCharge_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalMatter" ADD CONSTRAINT "LegalMatter_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalMatter" ADD CONSTRAINT "LegalMatter_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalMatter" ADD CONSTRAINT "LegalMatter_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterAccessGrant" ADD CONSTRAINT "MatterAccessGrant_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "LegalMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterAccessGrant" ADD CONSTRAINT "MatterAccessGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalDocument" ADD CONSTRAINT "LegalDocument_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "LegalMatter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalDocument" ADD CONSTRAINT "LegalDocument_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "LegalTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalDocumentVersion" ADD CONSTRAINT "LegalDocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "LegalDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentExtraction" ADD CONSTRAINT "DocumentExtraction_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "LegalDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentExtraction" ADD CONSTRAINT "DocumentExtraction_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "LegalDocumentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentReview" ADD CONSTRAINT "DocumentReview_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "LegalDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentReview" ADD CONSTRAINT "DocumentReview_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "LegalTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureEnvelope" ADD CONSTRAINT "SignatureEnvelope_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "LegalDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilingRecord" ADD CONSTRAINT "FilingRecord_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "LegalDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationAttempt" ADD CONSTRAINT "IntegrationAttempt_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "LegalMatter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalAuditEvent" ADD CONSTRAINT "LegalAuditEvent_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "LegalMatter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Append-only records are protected below the application layer. Corrections must
-- be represented by a new version, review, receipt, or audit event.
CREATE OR REPLACE FUNCTION prevent_governed_record_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER "LegalAuditEvent_append_only"
BEFORE UPDATE OR DELETE ON "LegalAuditEvent"
FOR EACH ROW EXECUTE FUNCTION prevent_governed_record_mutation();

CREATE TRIGGER "LegalDocumentVersion_append_only"
BEFORE UPDATE OR DELETE ON "LegalDocumentVersion"
FOR EACH ROW EXECUTE FUNCTION prevent_governed_record_mutation();

CREATE TRIGGER "DocumentReview_append_only"
BEFORE UPDATE OR DELETE ON "DocumentReview"
FOR EACH ROW EXECUTE FUNCTION prevent_governed_record_mutation();

CREATE TRIGGER "LegalWebhookReceipt_append_only"
BEFORE UPDATE OR DELETE ON "LegalWebhookReceipt"
FOR EACH ROW EXECUTE FUNCTION prevent_governed_record_mutation();

CREATE OR REPLACE FUNCTION prevent_legal_template_content_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."templateKey" IS DISTINCT FROM OLD."templateKey"
    OR NEW."jurisdiction" IS DISTINCT FROM OLD."jurisdiction"
    OR NEW."documentType" IS DISTINCT FROM OLD."documentType"
    OR NEW."version" IS DISTINCT FROM OLD."version"
    OR NEW."effectiveFrom" IS DISTINCT FROM OLD."effectiveFrom"
    OR NEW."effectiveUntil" IS DISTINCT FROM OLD."effectiveUntil"
    OR NEW."sourceSystem" IS DISTINCT FROM OLD."sourceSystem"
    OR NEW."sourceUri" IS DISTINCT FROM OLD."sourceUri"
    OR NEW."content" IS DISTINCT FROM OLD."content"
    OR NEW."contentHash" IS DISTINCT FROM OLD."contentHash"
  THEN
    RAISE EXCEPTION 'LegalTemplate version content is immutable' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "LegalTemplate_content_immutable"
BEFORE UPDATE ON "LegalTemplate"
FOR EACH ROW EXECUTE FUNCTION prevent_legal_template_content_mutation();
