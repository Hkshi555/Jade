import { Command } from "@sapphire/framework";
import { MessageFlags, type Message } from "discord.js";
import { isMessageInstance } from "@sapphire/discord.js-utilities";

export class PingCommand extends Command {
	public constructor(
		context: Command.LoaderContext,
		options: Command.Options,
	) {
		super(context, {
			...options,
			name: "ping",
			aliases: ["pong"],
			description: "ping pong",
		});
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName("ping")
				.setDescription("Ping bot to see if it is alive"),
		);
	}

	public override async chatInputRun(
		interaction: Command.ChatInputCommandInteraction,
	) {
		const callbackResponse = await interaction.reply({
			content: `Ping?`,
			withResponse: true,
			flags: MessageFlags.Ephemeral,
		});
		const msg = callbackResponse.resource?.message;

		if (msg && isMessageInstance(msg)) {
			const diff = msg.createdTimestamp - interaction.createdTimestamp;
			const ping = Math.round(this.container.client.ws.ping);
			return interaction.editReply(
				`Pong 🏓! (Round trip took: ${diff}ms. Heartbeat: ${ping}ms.)`,
			);
		}

		return interaction.editReply("Failed to retrieve ping :(");
	}

	public async messageRun(message) {
		if (message.channel.isTextBased()) {
			const msg = await message.channel.send("Ping?");
			const content = `Bot Latency ${Math.round(
				this.container.client.ws.ping,
			)}ms. API Latency ${
				msg.createdTimestamp - message.createdTimestamp
			}ms.`;

			return msg.edit(content);
		}
	}
}
