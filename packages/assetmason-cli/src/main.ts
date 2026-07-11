import { runCommand } from "./commands.js";

export async function main(argv: string[] = process.argv.slice(2)) {
  const { code, text } = await Promise.resolve(runCommand(argv));
  const target = text.endsWith("\n") ? text : `${text}\n`;
  if (code === 0) process.stdout.write(target);
  else process.stderr.write(target);
  return code;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().then((code) => process.exit(code));
}
