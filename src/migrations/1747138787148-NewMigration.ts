import { MigrationInterface, QueryRunner } from "typeorm";

export class NewMigration1747138787148 implements MigrationInterface {
    name = 'NewMigration1747138787148'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_6c1abc91ec330f5abb6f3342e4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e39e1b6caf9bcc0d3cdaa110f0"`);
        await queryRunner.query(`ALTER TABLE "operation_locks" DROP COLUMN "resourceId"`);
        await queryRunner.query(`ALTER TABLE "operation_locks" DROP COLUMN "context"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f889f4ca739044faa209469d02"`);
        await queryRunner.query(`ALTER TABLE "operation_locks" DROP COLUMN "operationName"`);
        await queryRunner.query(`DROP TYPE "public"."operation_locks_operationname_enum"`);
        await queryRunner.query(`ALTER TABLE "operation_locks" ADD "operationName" character varying(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "operation_locks" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f889f4ca739044faa209469d02" ON "operation_locks" ("operationName", "userId", "status") WHERE status = 'ACTIVE'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_f889f4ca739044faa209469d02"`);
        await queryRunner.query(`ALTER TABLE "operation_locks" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'`);
        await queryRunner.query(`ALTER TABLE "operation_locks" DROP COLUMN "operationName"`);
        await queryRunner.query(`CREATE TYPE "public"."operation_locks_operationname_enum" AS ENUM('card_order', 'set_spending_limit', 'add_sub_user')`);
        await queryRunner.query(`ALTER TABLE "operation_locks" ADD "operationName" "public"."operation_locks_operationname_enum" NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f889f4ca739044faa209469d02" ON "operation_locks" ("operationName", "status", "userId") WHERE (status = 'ACTIVE'::operation_locks_status_enum)`);
        await queryRunner.query(`ALTER TABLE "operation_locks" ADD "context" jsonb`);
        await queryRunner.query(`ALTER TABLE "operation_locks" ADD "resourceId" character varying NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_e39e1b6caf9bcc0d3cdaa110f0" ON "operation_locks" ("operationName", "resourceId", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_6c1abc91ec330f5abb6f3342e4" ON "operation_locks" ("resourceId") `);
    }

}
