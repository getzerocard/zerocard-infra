import { MigrationInterface, QueryRunner } from "typeorm";

export class NewMigration1747147640601 implements MigrationInterface {
    name = 'NewMigration1747147640601'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."funds_lock_status_enum" RENAME TO "funds_lock_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."funds_lock_status_enum" AS ENUM('LOCKED', 'FREE')`);
        await queryRunner.query(`ALTER TABLE "funds_lock" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "funds_lock" ALTER COLUMN "status" TYPE "public"."funds_lock_status_enum" USING "status"::"text"::"public"."funds_lock_status_enum"`);
        await queryRunner.query(`ALTER TABLE "funds_lock" ALTER COLUMN "status" SET DEFAULT 'LOCKED'`);
        await queryRunner.query(`DROP TYPE "public"."funds_lock_status_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."funds_lock_status_enum_old" AS ENUM('LOCKED', 'UNLOCKED')`);
        await queryRunner.query(`ALTER TABLE "funds_lock" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "funds_lock" ALTER COLUMN "status" TYPE "public"."funds_lock_status_enum_old" USING "status"::"text"::"public"."funds_lock_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "funds_lock" ALTER COLUMN "status" SET DEFAULT 'LOCKED'`);
        await queryRunner.query(`DROP TYPE "public"."funds_lock_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."funds_lock_status_enum_old" RENAME TO "funds_lock_status_enum"`);
    }

}
