import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Website {
	@PrimaryGeneratedColumn()
	ID: number;

	@Column("varchar", { nullable: true })
	title: string;

	@Column("text", { nullable: true })
	description: string;

	@Column("text")
	url: string;

	@Column("text")
	keywords: string;

	@Column("int", { default: 0 })
	clicks: number;
}
