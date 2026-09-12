-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'HOD', 'WOMEN_SAFETY_OFFICER', 'PRINCIPAL', 'AUTHORIZED_STAFF', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SensitivityLevel" AS ENUM ('NORMAL', 'CONFIDENTIAL', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('SUBMITTED', 'RECEIVED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REOPENED', 'CLOSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EscalationLevel" AS ENUM ('NONE', 'LEVEL_1', 'LEVEL_2', 'LEVEL_3');

-- CreateEnum
CREATE TYPE "RoutingTarget" AS ENUM ('WOMEN_SAFETY_OFFICER', 'HOD', 'FACILITIES_MAINTENANCE', 'HOSTEL_WARDEN', 'IMMEDIATE_RESPONDER');

-- CreateEnum
CREATE TYPE "SosStatus" AS ENUM ('TRIGGERED', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_ALARM');

-- CreateEnum
CREATE TYPE "ResourceCategory" AS ENUM ('LEGAL_RIGHTS', 'INSTITUTIONAL_POLICY', 'EMERGENCY_HELPLINE', 'SUPPORT_GUIDE');

-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('ANDROID', 'IOS', 'WEB');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "department_id" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "device_info" TEXT,
    "ip_address" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "hod_user_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "building" TEXT NOT NULL,
    "floor" TEXT,
    "room_identifier" TEXT NOT NULL,
    "qr_signature" TEXT,
    "department_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "is_womens_safety" BOOLEAN NOT NULL DEFAULT false,
    "sensitivity_level" "SensitivityLevel" NOT NULL DEFAULT 'NORMAL',
    "default_priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "default_sla_hours" INTEGER NOT NULL DEFAULT 48,
    "routing_target" "RoutingTarget" NOT NULL DEFAULT 'HOD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaint_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaints" (
    "id" TEXT NOT NULL,
    "public_complaint_number" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "department_id" TEXT,
    "location_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "confidentiality_level" "SensitivityLevel" NOT NULL DEFAULT 'NORMAL',
    "status" "ComplaintStatus" NOT NULL DEFAULT 'SUBMITTED',
    "escalation_level" "EscalationLevel" NOT NULL DEFAULT 'NONE',
    "assigned_to" TEXT,
    "is_legal_hold" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_status_history" (
    "id" TEXT NOT NULL,
    "complaint_id" TEXT NOT NULL,
    "old_status" "ComplaintStatus" NOT NULL,
    "new_status" "ComplaintStatus" NOT NULL,
    "changed_by_user_id" TEXT NOT NULL,
    "reason_comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaint_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_assignments" (
    "id" TEXT NOT NULL,
    "complaint_id" TEXT NOT NULL,
    "assigned_by_user_id" TEXT NOT NULL,
    "assigned_to_user_id" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaint_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_access_grants" (
    "id" TEXT NOT NULL,
    "complaint_id" TEXT NOT NULL,
    "granted_to_user_id" TEXT NOT NULL,
    "granted_by_user_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_access_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_case_notes" (
    "id" TEXT NOT NULL,
    "complaint_id" TEXT NOT NULL,
    "author_user_id" TEXT NOT NULL,
    "encrypted_note" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internal_case_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "complaint_id" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "original_file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "uploaded_by_user_id" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_sos_events" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "accuracy_meters" DECIMAL(6,2),
    "status" "SosStatus" NOT NULL DEFAULT 'TRIGGERED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "emergency_sos_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sos_responders" (
    "id" TEXT NOT NULL,
    "sos_event_id" TEXT NOT NULL,
    "responder_user_id" TEXT NOT NULL,
    "notified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_at" TIMESTAMP(3),
    "action_taken" TEXT,

    CONSTRAINT "sos_responders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_contacts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role_title" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "priority_order" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institution_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value_json" JSONB NOT NULL,
    "operating_calendar_json" JSONB,
    "last_updated_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institution_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_resources" (
    "id" TEXT NOT NULL,
    "category" "ResourceCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "content_markdown" TEXT NOT NULL,
    "source_reference" TEXT,
    "last_reviewed_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "safety_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "complaint_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "rating" SMALLINT NOT NULL,
    "comments" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" "DevicePlatform" NOT NULL DEFAULT 'ANDROID',
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_department_id_idx" ON "users"("department_id");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_refresh_token_hash_idx" ON "sessions"("refresh_token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "departments_hod_user_id_key" ON "departments"("hod_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "locations_qr_signature_key" ON "locations"("qr_signature");

-- CreateIndex
CREATE INDEX "locations_building_idx" ON "locations"("building");

-- CreateIndex
CREATE INDEX "locations_department_id_idx" ON "locations"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "complaint_categories_code_key" ON "complaint_categories"("code");

-- CreateIndex
CREATE INDEX "complaint_categories_is_womens_safety_idx" ON "complaint_categories"("is_womens_safety");

-- CreateIndex
CREATE INDEX "complaint_categories_sensitivity_level_idx" ON "complaint_categories"("sensitivity_level");

-- CreateIndex
CREATE UNIQUE INDEX "complaints_public_complaint_number_key" ON "complaints"("public_complaint_number");

-- CreateIndex
CREATE INDEX "complaints_student_id_idx" ON "complaints"("student_id");

-- CreateIndex
CREATE INDEX "complaints_category_id_idx" ON "complaints"("category_id");

-- CreateIndex
CREATE INDEX "complaints_department_id_idx" ON "complaints"("department_id");

-- CreateIndex
CREATE INDEX "complaints_status_idx" ON "complaints"("status");

-- CreateIndex
CREATE INDEX "complaints_priority_idx" ON "complaints"("priority");

-- CreateIndex
CREATE INDEX "complaints_confidentiality_level_idx" ON "complaints"("confidentiality_level");

-- CreateIndex
CREATE INDEX "complaints_assigned_to_idx" ON "complaints"("assigned_to");

-- CreateIndex
CREATE INDEX "complaints_created_at_idx" ON "complaints"("created_at");

-- CreateIndex
CREATE INDEX "complaint_status_history_complaint_id_idx" ON "complaint_status_history"("complaint_id");

-- CreateIndex
CREATE INDEX "complaint_assignments_complaint_id_idx" ON "complaint_assignments"("complaint_id");

-- CreateIndex
CREATE INDEX "case_access_grants_complaint_id_idx" ON "case_access_grants"("complaint_id");

-- CreateIndex
CREATE INDEX "case_access_grants_granted_to_user_id_idx" ON "case_access_grants"("granted_to_user_id");

-- CreateIndex
CREATE INDEX "internal_case_notes_complaint_id_idx" ON "internal_case_notes"("complaint_id");

-- CreateIndex
CREATE UNIQUE INDEX "attachments_storage_key_key" ON "attachments"("storage_key");

-- CreateIndex
CREATE INDEX "attachments_complaint_id_idx" ON "attachments"("complaint_id");

-- CreateIndex
CREATE INDEX "emergency_sos_events_student_id_idx" ON "emergency_sos_events"("student_id");

-- CreateIndex
CREATE INDEX "emergency_sos_events_status_idx" ON "emergency_sos_events"("status");

-- CreateIndex
CREATE INDEX "emergency_sos_events_created_at_idx" ON "emergency_sos_events"("created_at");

-- CreateIndex
CREATE INDEX "sos_responders_sos_event_id_idx" ON "sos_responders"("sos_event_id");

-- CreateIndex
CREATE INDEX "sos_responders_responder_user_id_idx" ON "sos_responders"("responder_user_id");

-- CreateIndex
CREATE INDEX "emergency_contacts_is_active_idx" ON "emergency_contacts"("is_active");

-- CreateIndex
CREATE INDEX "emergency_contacts_priority_order_idx" ON "emergency_contacts"("priority_order");

-- CreateIndex
CREATE UNIQUE INDEX "institution_settings_key_key" ON "institution_settings"("key");

-- CreateIndex
CREATE INDEX "safety_resources_category_idx" ON "safety_resources"("category");

-- CreateIndex
CREATE INDEX "safety_resources_is_active_idx" ON "safety_resources"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_complaint_id_key" ON "feedback"("complaint_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs"("actor_user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_idx" ON "audit_logs"("entity_type");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens"("token");

-- CreateIndex
CREATE INDEX "device_tokens_user_id_idx" ON "device_tokens"("user_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_hod_user_id_fkey" FOREIGN KEY ("hod_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "complaint_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_status_history" ADD CONSTRAINT "complaint_status_history_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_status_history" ADD CONSTRAINT "complaint_status_history_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_assignments" ADD CONSTRAINT "complaint_assignments_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_assignments" ADD CONSTRAINT "complaint_assignments_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_assignments" ADD CONSTRAINT "complaint_assignments_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_access_grants" ADD CONSTRAINT "case_access_grants_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_access_grants" ADD CONSTRAINT "case_access_grants_granted_to_user_id_fkey" FOREIGN KEY ("granted_to_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_access_grants" ADD CONSTRAINT "case_access_grants_granted_by_user_id_fkey" FOREIGN KEY ("granted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_case_notes" ADD CONSTRAINT "internal_case_notes_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_case_notes" ADD CONSTRAINT "internal_case_notes_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_sos_events" ADD CONSTRAINT "emergency_sos_events_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sos_responders" ADD CONSTRAINT "sos_responders_sos_event_id_fkey" FOREIGN KEY ("sos_event_id") REFERENCES "emergency_sos_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sos_responders" ADD CONSTRAINT "sos_responders_responder_user_id_fkey" FOREIGN KEY ("responder_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
