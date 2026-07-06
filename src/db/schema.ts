import { createId } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
import {
    integer,
    sqliteTable,
    text,
    index,
} from "drizzle-orm/sqlite-core";

import { customAlphabet } from "nanoid";

const createSessionId = customAlphabet(
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz_-",
    48
);

export const credentials = sqliteTable("credentials", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userEmail: text("user_email").unique().notNull(),
    username: text("username"),
    gitsetKey: text("gitset_key").unique().notNull(),
    githubOauthToken: text("github_oauth_token"),
    avatarUrl: text("avatar_url"),
    userPlan: text("user_plan", { enum: ["basic", "pro", "enterprise"] })
        .notNull()
        .default("basic"),
    createdAt: text("created_at").default(sql`datetime('now')`),
}, (table) => ({
    idxUserEmail: index("idx_user_email").on(table.userEmail),
    idxGitsetKey: index("idx_gitset_key").on(table.gitsetKey),
}));

export const credentialsRelations = relations(credentials, ({ many }) => ({
    sessions: many(sessions),
    loginLogs: many(loginLogs),
}));

export const sessions = sqliteTable("sessions", {
    id: text("id")
        .$default(() => createSessionId())
        .primaryKey(),
    userId: integer("userId").references(() => credentials.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at").notNull(),
});

export const sessionRelations = relations(sessions, ({ one }) => ({
    user: one(credentials, {
        fields: [sessions.userId],
        references: [credentials.id],
    }),
    loginLog: one(loginLogs),
}));

export const loginLogs = sqliteTable(
    "login_logs",
    {
        id: text("id")
            .$default(() => createId())
            .primaryKey(),
        sessionId: text("session_id").references(() => sessions.id, {
            onDelete: "cascade",
        }),
        userId: integer("user_id").references(() => credentials.id, {
            onDelete: "cascade",
        }),

        strategy: text("strategy", {
            enum: ["github", "google", "credentials", "magic_link"],
        }).notNull(),

        browser: text("browser").notNull(),
        device: text("device").notNull(),
        os: text("os").notNull(),
        ip: text("ip").notNull(),
        loggedInAt: text("logged_in_at").default(sql`CURRENT_TIMESTAMP`),
    },
    (table) => ({
        loginLogsUserIdIdx: index("login_logs_user_id_idx").on(table.userId),
    })
);

export const loginLogsRelations = relations(loginLogs, ({ one }) => ({
    user: one(credentials, {
        fields: [loginLogs.userId],
        references: [credentials.id],
    }),
    session: one(sessions, {
        fields: [loginLogs.sessionId],
        references: [sessions.id],
    }),
}));

export const messageUsage = sqliteTable(
    "message_usage",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        userEmail: text("user_email").references(() => credentials.userEmail),
        createdAt: text("created_at").default(sql`datetime('now')`),
    },
    (table) => ({
        idxMessageUsageDate: index("idx_message_usage_date").on(
            table.userEmail,
            table.createdAt
        ),
    })
);

export const messageUsageRelations = relations(messageUsage, ({ one }) => ({
    user: one(credentials, {
        fields: [messageUsage.userEmail],
        references: [credentials.userEmail],
    }),
}));

export const repoSettings = sqliteTable("repo_settings", {
    userEmail: text("user_email").primaryKey(),
    labelsTemplate: text("labels_template"),
    aboutDraft: text("about_draft"),
    backupConfig: text("backup_config"),
    updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const repoSettingsRelations = relations(repoSettings, ({ one }) => ({
    user: one(credentials, {
        fields: [repoSettings.userEmail],
        references: [credentials.userEmail],
    }),
}));
