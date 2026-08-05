CREATE TABLE `announcements` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`audience` text NOT NULL,
	`published_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text,
	`actor_role` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_reference` text NOT NULL,
	`timestamp` integer NOT NULL,
	`summary` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `contribution_obligations` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`month_period` text NOT NULL,
	`expected_amount_kobo` integer NOT NULL,
	`paid_amount_kobo` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`due_date` integer NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `demo_email_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`recipient` text NOT NULL,
	`template` text NOT NULL,
	`subject` text NOT NULL,
	`payload` text NOT NULL,
	`sent_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `fund_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`reference` text NOT NULL,
	`type` text NOT NULL,
	`amount_kobo` integer NOT NULL,
	`status` text NOT NULL,
	`requested_at` integer NOT NULL,
	`processed_at` integer,
	`processed_by` text,
	`notes` text,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`processed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fund_requests_reference_unique` ON `fund_requests` (`reference`);--> statement-breakpoint
CREATE TABLE `guarantor_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`loan_id` text NOT NULL,
	`guarantor_member_id` text NOT NULL,
	`status` text NOT NULL,
	`comment` text,
	`requested_at` integer NOT NULL,
	FOREIGN KEY (`loan_id`) REFERENCES `loans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`guarantor_member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ledger_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`reference` text NOT NULL,
	`type` text NOT NULL,
	`payment_source` text,
	`status` text NOT NULL,
	`description` text,
	`amount_kobo` integer NOT NULL,
	`date` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ledger_transactions_reference_unique` ON `ledger_transactions` (`reference`);--> statement-breakpoint
CREATE TABLE `loan_products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`min_amount_kobo` integer NOT NULL,
	`max_amount_kobo` integer NOT NULL,
	`interest_rate` real NOT NULL,
	`max_term_months` integer NOT NULL,
	`required_guarantors` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `loans` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`loan_product_id` text NOT NULL,
	`reference` text NOT NULL,
	`principal_kobo` integer NOT NULL,
	`interest_kobo` integer NOT NULL,
	`total_due_kobo` integer NOT NULL,
	`paid_kobo` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`term_months` integer NOT NULL,
	`applied_at` integer NOT NULL,
	`disbursed_at` integer,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`loan_product_id`) REFERENCES `loan_products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `loans_reference_unique` ON `loans` (`reference`);--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`membership_number` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`phone_number` text NOT NULL,
	`status` text NOT NULL,
	`total_contributions_kobo` integer DEFAULT 0 NOT NULL,
	`deposit_balance_kobo` integer DEFAULT 0 NOT NULL,
	`shares_balance_kobo` integer DEFAULT 0 NOT NULL,
	`joined_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `members_user_id_unique` ON `members` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `members_membership_number_unique` ON `members` (`membership_number`);--> statement-breakpoint
CREATE TABLE `membership_applications` (
	`id` text PRIMARY KEY NOT NULL,
	`reference` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text NOT NULL,
	`phone_number` text NOT NULL,
	`employment` text NOT NULL,
	`status` text NOT NULL,
	`review_notes` text,
	`submitted_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `membership_applications_reference_unique` ON `membership_applications` (`reference`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`product_id` text NOT NULL,
	`product_name` text NOT NULL,
	`unit_price_kobo` integer NOT NULL,
	`quantity` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`reference` text NOT NULL,
	`status` text NOT NULL,
	`total_kobo` integer NOT NULL,
	`item_count` integer NOT NULL,
	`note` text,
	`placed_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_reference_unique` ON `orders` (`reference`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`category` text NOT NULL,
	`unit` text NOT NULL,
	`price_kobo` integer NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`image_emoji` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `repayment_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`loan_id` text NOT NULL,
	`due_date` integer NOT NULL,
	`expected_amount_kobo` integer NOT NULL,
	`paid_amount_kobo` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	FOREIGN KEY (`loan_id`) REFERENCES `loans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);