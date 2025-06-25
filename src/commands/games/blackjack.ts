import { Awaitable, ChatInputCommand, Command } from "@sapphire/framework";
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} from "discord.js";

export default class blackJackCommnad extends Command {
    private userCards: string[] = [];
    private dealerCards: string[] = [];
    private cards: string[] = [
        ":regional_indicator_a:",
        ":regional_indicator_k:",
        ":regional_indicator_j:",
        ":regional_indicator_q:",
        ":one:",
        ":two:",
        ":three:",
        ":four:",
        ":five:",
        ":six:",
        ":seven:",
        ":eight:",
        ":nine:",
      ];


  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "blackjack",
      description: "Play a game of blackjack!",
      detailedDescription:
        "Play a game of blackjack against the dealer. You can hit, stand, or double down. The goal is to get as close to 21 as possible without going over.",
      requiredClientPermissions: ["SendMessages", "EmbedLinks"],
      requiredUserPermissions: ["SendMessages", "EmbedLinks"],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName("blackjack").setDescription("Play a game of blackjack!")
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    
    
  }

  public convertCardsToValue(cards: string[]): number {
    const cardValues = {
        "regional_indicator_a:": 11,
        "regional_indicator_k:": 10,
        "regional_indicator_j:": 10,
        "regional_indicator_q:": 10,
        "one:": 1,
        "two:": 2,
        "three:": 3,
        "four:": 4,
        "five:": 5,
        "six:": 6,
        "seven:": 7,
        "eight:": 8,
        "nine:": 9,
      }
      return cards.map(card => cardValues[card] ).reduce((a, b) => a + b, 0);
    
  }
}
