import sqlite3 from "sqlite3";
import { Database } from "sqlite";
import fs from "fs";
import { container } from "@sapphire/framework";

export default class database extends Database implements IDatabase {
	constructor() {
		super({
			filename: "database/database.db",
			driver: sqlite3.Database,
		});
	}
	public override async close() {
		return super.close();
	}

	public override async open() {
		return super.open();
	}

	public async createFolder() {
		if (!this.folderExists("database")) {
			try {
				fs.mkdirSync("database");
				container.logger.info("Created database folder");
			} catch (err) {
				container.logger.error(
					`Error creating database folder: ${err}`,
				);
			}
			try {
				fs.writeFileSync("database/database.db", "");
				container.logger.info("Created database file");
			} catch (err) {
				container.logger.error(`Error creating database file: ${err}`);
			}
		} else {
			container.logger.info("Database folder already exists");
		}
	}

	private folderExists(folder: string) {
		const f = fs.readdirSync(folder);
		if (f.length > 0) {
			return true;
		}
		return false;
	}
}

interface IDatabase {
	open(): Promise<void>;
	close(): Promise<void>;
	createFolder(): Promise<void>;
}
