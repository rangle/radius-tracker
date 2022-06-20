import { CommandModule } from "yargs";

export const defineYargsModule = <U>(
    command: string,
    description: string,
    options: CommandModule<{}, U>["builder"],
    handler: CommandModule<{}, U>["handler"],
): CommandModule<{}, U> => {
    return {
        command,
        describe: description,
        builder: options,
        handler,
    };
};
