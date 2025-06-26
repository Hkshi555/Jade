import { Command } from "@sapphire/framework";

export default class userInfoCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: "userinfo",
            description: "Shows information about user.",
            
        })
    }
}