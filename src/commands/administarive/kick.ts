import { Command } from "@sapphire/framework";
import { GuildMember } from "discord.js";
import { client } from "../..";

export default class kickCommand extends Command {
    private database = client.database

    public constructor(
        context: Command.LoaderContext,
        options: Command.Options,
    ) {
        super(context, {
           ...options,
            name: "kick",
            description: "Kicks a user from the server",
            requiredClientPermissions: ["KickMembers"],
            requiredUserPermissions: ["KickMembers"],
        });
    }


    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
               .setName("kick")
               .setDescription("Kicks a user from the server")
               .addUserOption((option) =>
                    option.setName("user").setDescription("The user to kick").setRequired(true),
                )
               .addStringOption((option) =>
                    option.setName("reason").setDescription("The reason for kicking").setRequired(true),
                ),
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const user = interaction.options.getUser("user");
        const reason = interaction.options.getString("reason");

        const member: GuildMember | null = await interaction.guild.members.fetch(user.id);

        if (!user ||!reason) {
            return interaction.reply({ content: "Invalid usage. Please provide a user and a reason." });
        }

        if (!member) {
            return interaction.reply({ content: "User not found." });
        }

        if (!member.kickable) {
            return interaction.reply({ content: "I cannot kick this user." });
        }
        
        await interaction.guild.members.kick(user.id, reason);
        await interaction.reply({ content: `Kicked ${user.username} for: ${reason}` });
        this.database.run("INSERT INTO kick (userID, guildID, reason) VALUES (?,?,?)", [user.id, interaction.guild.id, reason]);
    }
}