import { container, SapphireClient } from "@sapphire/framework";
import { GatewayIntentBits, Partials } from "discord.js";
import "dotenv/config";
import database from "./database";

export class Client extends SapphireClient implements IClient {
	public mode: IMode;
	public database: database;

	public constructor() {
		super({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMembers,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.GuildVoiceStates,
				GatewayIntentBits.MessageContent,
				GatewayIntentBits.DirectMessages,
				GatewayIntentBits.DirectMessageTyping,
				GatewayIntentBits.GuildPresences,
			],
			partials: [
				Partials.Channel,
				Partials.Message,
				Partials.GuildMember,
			],
			loadMessageCommandListeners: true,
		});
		this.mode = process.argv.slice(2).includes("--dev") ? "dev" : "prod";
	}

	public override async login() {
		this.database = new database();
		this.database.createFolder();
		this.database
			.open()
			.then(() => {
				container.logger.info("Database opened");
			})
			.catch((err) => {
				container.logger.error(`Error opening database: ${err}`);
			});

		//homeworkDB
		this.database.exec(
			"CREATE TABLE IF NOT EXISTS homeworkExists (id INTEGER PRIMARY KEY AUTOINCREMENT, superID TEXT, title TEXT, forumChannelID TEXT, forumID TEXT)",
		);
		//kickBD
		this.database.exec(
			"CREATE TABLE IF NOT EXISTS kick (id INTEGER PRIMARY KEY AUTOINCREMENT, userID TEXT, guildID TEXT, reason TEXT)",
		)
		//banBD
		this.database.exec(
			"CREATE TABLE IF NOT EXISTS ban (id INTEGER PRIMARY KEY AUTOINCREMENT, userID TEXT, guildID TEXT, reason TEXT), duration INTEGER)",
		)
		container.logger.info(`Logging in...`);
		return super.login(
			this.mode == "dev"
				? process.env.dev_client_token
				: process.env.prod_client_token,
		);
	}
}

export type IMode = "dev" | "prod";

export interface IClient {
	mode: IMode;
	database;
}
