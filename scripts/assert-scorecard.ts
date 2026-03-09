// @anchor script:anchors.assert-scorecard links=script:anchors.scorecard,interface:anchors.scorecard-api,interface:anchors.scorecard-assertion,doc:n1hub.codex note="Fails execution when scorecard.passed is not true."
import { assertScorecardFile } from "../lib/anchors";

function getTargetPath(args: readonly string[]): string {
  const byFlag = args.find((arg) => arg.startsWith("--file="));
  if (byFlag) return byFlag.slice("--file=".length);
  const positional = args.find((arg) => !arg.startsWith("--"));
  return positional ?? ".anchors-scorecard.json";
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function main(): void {
  const target = getTargetPath(process.argv.slice(2));
  const result = assertScorecardFile(target);
  if (!result.ok) fail(result.message);
  console.log(result.message);
}

main();
