import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const profiles = sqliteTable("profiles", {
  userId: text("user_id").primaryKey(), email: text("email").notNull(), name: text("name"),
  businessName: text("business_name"), role: text("role").notNull().default("client"),
  brandJson: text("brand_json").notNull().default("{}"), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), businessName: text("business_name").notNull(),
  title: text("title").notNull(), service: text("service").notNull(), status: text("status").notNull().default("awaiting_payment"),
  paymentStatus: text("payment_status").notNull().default("pending"), amountCents: integer("amount_cents"),
  briefJson: text("brief_json").notNull().default("{}"), dueStart: text("due_start"), dueEnd: text("due_end"),
  clientNote: text("client_note"), internalNote: text("internal_note"), stageUpdatedAt: text("stage_updated_at"),
  createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, (table) => [index("idx_projects_user_created").on(table.userId, table.createdAt), index("idx_projects_status").on(table.status)]);

export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(), projectId: text("project_id").notNull(), userId: text("user_id").notNull(),
  kind: text("kind").notNull().default("client_upload"), fileKey: text("file_key").notNull(), fileName: text("file_name").notNull(),
  contentType: text("content_type"), size: integer("size").notNull().default(0), createdAt: text("created_at").notNull(),
}, (table) => [index("idx_assets_project").on(table.projectId)]);
