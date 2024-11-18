import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Queue {
  @PrimaryGeneratedColumn()
  ID: number;

  @Column("text")
  url: string;
}
