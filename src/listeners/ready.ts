import { Listener } from "@sapphire/framework";
import { Client } from "../client/client";

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
