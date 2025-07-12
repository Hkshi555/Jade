import { Listener } from "@sapphire/framework";
import { Client } from "../client/client";
import { ActivityType } from "discord.js";
import axios from "axios"
import config from "../../config.json"

export class ReadyListener extends Listener {
	public constructor(
		context: Listener.LoaderContext,
		options: Listener.Options,
	) {
		super(context, {
			...options,
			once: true,
			event: "ready",
		});
	}

	public async run(client: Client) {
		const { username, id } = client.user!;
		this.container.logger.info(
			`Successfully logged in as ${username} (${id})`,
		);
		this.container.logger.info(
			`Mode: ${client.mode == "dev" ? "Development" : "Production"}`,
		);
	}
}
