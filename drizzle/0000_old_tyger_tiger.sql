CREATE TABLE "convex_service" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"project_id" text NOT NULL,
	"convex_url" text NOT NULL,
	"convex_deploy_key" text NOT NULL,
	"infisical_url" text NOT NULL,
	"infisical_client_id" text NOT NULL,
	"infisical_client_secret" text NOT NULL,
	"infisical_project_id" text NOT NULL,
	"infisical_env_id" text NOT NULL,
	"infisical_secret_path" text DEFAULT '/' NOT NULL,
	"webhook_secret" text NOT NULL,
	"activated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "convex_service_infisical_project_env_path_unique" UNIQUE("infisical_project_id","infisical_env_id","infisical_secret_path")
);
--> statement-breakpoint
CREATE TABLE "dokploy_service" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"project_id" text NOT NULL,
	"dokploy_url" text NOT NULL,
	"dokploy_api_token" text NOT NULL,
	"dokploy_app_id" text NOT NULL,
	"dokploy_app_type" text DEFAULT 'application' NOT NULL,
	"infisical_url" text NOT NULL,
	"infisical_client_id" text NOT NULL,
	"infisical_client_secret" text NOT NULL,
	"infisical_project_id" text NOT NULL,
	"infisical_env_id" text NOT NULL,
	"infisical_secret_path" text DEFAULT '/' NOT NULL,
	"webhook_secret" text NOT NULL,
	"activated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dokploy_service_infisical_project_env_path_unique" UNIQUE("infisical_project_id","infisical_env_id","infisical_secret_path")
);
--> statement-breakpoint
CREATE TABLE "infisical_env" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"environment" text NOT NULL,
	"activated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "infisical_env_environment_unique" UNIQUE("environment")
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"activated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "convex_service" ADD CONSTRAINT "convex_service_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "convex_service" ADD CONSTRAINT "convex_service_infisical_env_id_infisical_env_id_fk" FOREIGN KEY ("infisical_env_id") REFERENCES "public"."infisical_env"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dokploy_service" ADD CONSTRAINT "dokploy_service_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dokploy_service" ADD CONSTRAINT "dokploy_service_infisical_env_id_infisical_env_id_fk" FOREIGN KEY ("infisical_env_id") REFERENCES "public"."infisical_env"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "convex_service_project_id_idx" ON "convex_service" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "convex_service_activated_at_idx" ON "convex_service" USING btree ("activated_at");--> statement-breakpoint
CREATE INDEX "convex_service_infisical_project_id_idx" ON "convex_service" USING btree ("infisical_project_id","infisical_env_id","infisical_secret_path");--> statement-breakpoint
CREATE INDEX "dokploy_service_project_id_idx" ON "dokploy_service" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "dokploy_service_activated_at_idx" ON "dokploy_service" USING btree ("activated_at");--> statement-breakpoint
CREATE INDEX "dokploy_service_infisical_project_id_idx" ON "dokploy_service" USING btree ("infisical_project_id","infisical_env_id","infisical_secret_path");--> statement-breakpoint
CREATE INDEX "infisical_env_activated_at_idx" ON "infisical_env" USING btree ("activated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "project_name_unique" ON "project" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "project_activated_at_idx" ON "project" USING btree ("activated_at");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");