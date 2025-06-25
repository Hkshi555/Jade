import { Command } from "@sapphire/framework";
import { GuildMember } from "discord.js";
import { client } from "../..";

export default class banCommand extends Command {
    private database = client.database

    public constructor(
        context: Command.LoaderContext,
        options: Command.Options,
    ) {
        super(context, {
           ...options,
            name: "ban",
            description: "Bans a user from the server",
            requiredClientPermissions: ["BanMembers"],
            requiredUserPermissions: ["BanMembers"],
        });
    }


    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
               .setName("ban")
               .setDescription("Ban a user from the server")
               .addUserOption((option) =>
                    option.setName("user").setDescription("The user to Ban").setRequired(true),
                )
               .addStringOption((option) =>
                    option.setName("reason").setDescription("The reason for ban").setRequired(true),
                )
                .addStringOption((option) =>
                    option.setName("duration").setDescription("Duration of ban in minutes [default 60]").setRequired(false),
                ),
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const user = interaction.options.getUser("user");
        const reason = interaction.options.getString("reason");
        const minutes = interaction.options.getInteger("duration") * 60000; // Convert minutes to milliseconds

        const member: GuildMember | null = await interaction.guild.members.fetch(user.id);

        if (!user ||!reason) {
            return interaction.reply({ content: "Invalid usage. Please provide a user and a reason." });
        }

        if (!member) {
            return interaction.reply({ content: "User not found." });
        }

        if (!member.bannable) {
            return interaction.reply({ content: "I cannot ban this user." });
        }
        
        await interaction.guild.members.ban(user.id, { reason: reason,  });
        await interaction.reply({ content: `Banned ${user.username} for: ${reason} for ${minutes} minutes` });
        this.database.run("INSERT INTO ban (userID, guildID, reason, duration) VALUES (?,?,?,?)", [user.id, interaction.guild.id, reason, minutes]);
    }
}