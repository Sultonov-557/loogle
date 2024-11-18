import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Website {
  @PrimaryGeneratedColumn()
  ID: number;

  @Column("varchar")
  title: string;

  @Column("text")
  url: string;

  @Column("text")
  keywords: string;

  @Column("int", { default: 0 })
  clicks: number;
}
