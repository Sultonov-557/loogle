import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Webpage {
  @PrimaryGeneratedColumn()
  ID: number;

  @Column("text")
  url: string;

  @Column("varchar", { nullable: true })
  title: string;

  @Column("text", { nullable: true })
  description: string;

  @Column("json")
  headers: Record<string, string[]>;

  @Column("text",{nullable:true})
  keywords?: string;

  @Column("int", { default: 0 })
  clicks: number;
}
