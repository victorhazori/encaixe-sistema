import {
  boolean,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  time,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["admin", "staff", "customer"]);
export const appointmentStatus = pgEnum("appointment_status", [
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
]);

export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 80 }).notNull(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  priceCents: integer("price_cents").notNull().default(0),
  limits: jsonb("limits").notNull().default({}),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").references(() => plans.id),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  phone: varchar("phone", { length: 30 }),
  address: text("address"),
  logoUrl: text("logo_url"),
  primaryColor: varchar("primary_color", { length: 16 }).notNull().default("#d99442"),
  timezone: varchar("timezone", { length: 60 }).notNull().default("America/Sao_Paulo"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    email: varchar("email", { length: 200 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRole("role").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_tenant_email_idx").on(table.tenantId, table.email)],
);

export const customers = pgTable(
  "customers",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    name: varchar("name", { length: 160 }).notNull(),
    email: varchar("email", { length: 200 }),
    phone: varchar("phone", { length: 30 }).notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("customers_tenant_phone_idx").on(table.tenantId, table.phone)],
);

export const professionals = pgTable("professionals", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 160 }).notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description"),
  durationMinutes: integer("duration_minutes").notNull(),
  priceCents: integer("price_cents").notNull(),
  icon: varchar("icon", { length: 40 }).notNull().default("scissors"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const serviceProfessionals = pgTable(
  "service_professionals",
  {
    tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    serviceId: integer("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
    professionalId: integer("professional_id").notNull().references(() => professionals.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.serviceId, table.professionalId] })],
);

export const workingHours = pgTable(
  "working_hours",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    professionalId: integer("professional_id").notNull().references(() => professionals.id, { onDelete: "cascade" }),
    weekday: integer("weekday").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
  },
  (table) => [uniqueIndex("hours_professional_weekday_idx").on(table.professionalId, table.weekday)],
);

export const blocks = pgTable("blocks", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  professionalId: integer("professional_id").references(() => professionals.id, { onDelete: "cascade" }),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  reason: varchar("reason", { length: 200 }),
});

export const appointments = pgTable(
  "appointments",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    customerId: integer("customer_id").notNull().references(() => customers.id),
    professionalId: integer("professional_id").notNull().references(() => professionals.id),
    serviceId: integer("service_id").notNull().references(() => services.id),
    extraServiceIds: jsonb("extra_service_ids").$type<number[]>().notNull().default([]),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: appointmentStatus("status").notNull().default("confirmed"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("appointments_professional_start_idx").on(table.professionalId, table.startsAt)],
);

export const tenantFeatures = pgTable(
  "tenant_features",
  {
    tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    key: varchar("key", { length: 100 }).notNull(),
    enabled: boolean("enabled").notNull().default(false),
  },
  (table) => [primaryKey({ columns: [table.tenantId, table.key] })],
);

export const loyaltyRules = pgTable("loyalty_rules", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  appointmentsRequired: integer("appointments_required").notNull(),
  rewardDescription: varchar("reward_description", { length: 240 }).notNull(),
  active: boolean("active").notNull().default(true),
});

export const loyaltyBalances = pgTable(
  "loyalty_balances",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
    ruleId: integer("rule_id").notNull().references(() => loyaltyRules.id, { onDelete: "cascade" }),
    progress: integer("progress").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("loyalty_customer_rule_idx").on(table.customerId, table.ruleId)],
);

// Mantida para futuras exceções específicas por data no calendário.
export const calendarDays = pgTable("calendar_days", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  day: date("day").notNull(),
  note: text("note"),
});
