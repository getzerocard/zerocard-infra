import type { MigrationInterface, QueryRunner } from 'typeorm';

export class NewMigration1746488721789 implements MigrationInterface {
  name = 'NewMigration1746488721789';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."transactions_status_enum" RENAME TO "transactions_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transactions_status_enum" AS ENUM('pending', 'completed', 'refund', 'failed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ALTER COLUMN "status" TYPE "public"."transactions_status_enum" USING "status"::"text"::"public"."transactions_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."transactions_status_enum_old"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."transactions_status_enum_old" AS ENUM('pending', 'completed', 'refund')`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ALTER COLUMN "status" TYPE "public"."transactions_status_enum_old" USING "status"::"text"::"public"."transactions_status_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."transactions_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."transactions_status_enum_old" RENAME TO "transactions_status_enum"`,
    );
  }
}
